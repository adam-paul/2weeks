import { WebSocketServer } from 'ws';

const server = new WebSocketServer({ port: 8080 });

function broadcastToAll(message) {
  server.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      console.log('Sending receipt...');
      client.send(message);
      console.log('Receipt sent.');
    }
  });
}

function broadcastToOthers(sender, message) {
  server.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== sender) {
      client.send(message);
    }
  });
}

server.on('connection', (socket, request) => {
  const ip = request.socket.remoteAddress;
  const port = request.socket.remotePort;

  socket.clientId = `${ip}:${port}`;

  console.log(`Client connected: ${socket.clientId}.`);
  socket.send(`You have connected to the server. Your IP is ${socket.clientId}.`);
  broadcastToOthers(socket, `A new client has connected: ${socket.clientId}.`);

  socket.on('message', (data) => {
    const message = data.toString();
    console.log('Message received:', message);
    broadcastToAll(`${socket.clientId}: ${message}`);
  });

  socket.on('close', () => {
    console.log(`Client disconnected: ${socket.clientId}.`);
    broadcastToOthers(socket, `${socket.clientId} has disconnected.`);
  });
});
