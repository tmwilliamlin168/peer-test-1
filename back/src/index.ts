import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { ExpressPeerServer } from 'peer';

dotenv.config();

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const peerServer = ExpressPeerServer(server, { path: '/peer' });
peerServer.on('connection', (client) => {
  console.log('Peer connected:', client.getId());
});
app.use(peerServer);
app.use(express.static(path.join(__dirname, '../../front/build')));
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
