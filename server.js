import { WebSocketServer, WebSocket } from 'ws';

// === Configuration ===
const PORT = 8080;
const HEARTBEAT_MS = 30000;

// === Server Setup ===
const server = new WebSocketServer({ port: PORT });

// === Helper Functions ===
function broadcastToAll(message) {
  server.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      console.log('Message published.');
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

// === Event Handlers ===
server.on('connection', (socket, request) => {
  const ip = request.socket.remoteAddress;
  const port = request.socket.remotePort;

  socket.clientId = `${ip}:${port}`;
  socket.isAlive = true;

  socket.on('pong', () => {
    socket.isAlive = true;
  });

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

// === Heartbeat ===
const heartbeatInterval = setInterval(() => {
  server.clients.forEach(socket => {
    if (socket.isAlive === false) {
      console.log(`Client unresponsive: ${socket.clientId}. Terminating.`);
      return socket.terminate();
    }

    socket.isAlive = false;
    socket.ping();
  });
}, HEARTBEAT_MS);

server.on('close', () => {
  clearInterval(heartbeatInterval);
});
