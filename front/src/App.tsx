import Peer from 'peerjs';

import 'App.css';
import { useEffect, useRef, useState } from 'react';

// https://github.com/peers/peerjs/issues/158#issuecomment-614779167

const createMediaStreamFake = () => {
  return new MediaStream([
    createEmptyAudioTrack(),
    createEmptyVideoTrack({ width: 640, height: 480 }),
  ]);
};

const createEmptyAudioTrack = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const dst = oscillator.connect(ctx.createMediaStreamDestination()) as any;
  oscillator.start();
  const track = dst.stream.getAudioTracks()[0];
  return Object.assign(track, { enabled: false });
};

const createEmptyVideoTrack = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const canvas = Object.assign(document.createElement('canvas'), {
    width,
    height,
  });
  canvas.getContext('2d')?.fillRect(0, 0, width, height);

  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];

  return Object.assign(track, { enabled: false });
};

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [peerId, setPeerId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [callPeer, setCallPeer] = useState(() => (peerId: string) => {
    console.log('Supposed to call peer');
  });
  const broadcastStream = useRef({ stream: null as MediaStream | null });

  useEffect(() => {
    const peer = new Peer({
      host: '/',
      port:
        (process.env.REACT_APP_PEER_PORT && +process.env.REACT_APP_PEER_PORT) ||
        +window.location.port,
      debug: 1,
      path: '/peer',
    });
    peer.on('open', (id) => setPeerId(id));

    peer.on('call', (call) => {
      if (!broadcastStream?.current.stream) {
        call.close();
        return;
      }
      console.log('Answering call from peer', call.peer);
      call.answer(broadcastStream.current.stream);
    });

    setCallPeer(() => (peerId: string) => {
      console.log('Connecting to peer', peerId);
      const call = peer.call(peerId, createMediaStreamFake());
      call.on('error', (e) => console.error(e));
      call.on('close', () => console.log('closed'));
      call.on('stream', (stream) => {
        console.log('Got the stream!');
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.autoplay = true;
      });
    });

    return () => {
      peer.destroy();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {peerId ? `Your Peer ID: ${peerId}` : 'Peer not connected'}
      {!inCall && (
        <div>
          <button
            onClick={() => {
              navigator.mediaDevices
                .getDisplayMedia({ video: true, audio: true })
                .then((stream) => {
                  broadcastStream.current.stream = stream;
                  setInCall(true);
                });
            }}
          >
            Start broadcast
          </button>
          <button
            onClick={() => {
              const otherPeer = prompt('Enter peer ID to call');
              if (!otherPeer) return;
              callPeer(otherPeer);
            }}
          >
            Connect to broadcast
          </button>
        </div>
      )}
      <video ref={videoRef} />
    </div>
  );
}

export default App;
