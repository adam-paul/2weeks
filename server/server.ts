import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../src/lib/types.js';

// === Configuration ===
const PORT = 8080;
const HEARTBEAT_MS = 30000;

// === Extended WebSocket type ===
// The ws library's WebSocket doesn't know about our custom properties.
// We extend it so TypeScript tracks them.
interface ClientSocket extends WebSocket {
	clientId: string;
	isAlive: boolean;
}

// === Helper: serialize and send a ServerMessage ===
function send(socket: ClientSocket, message: ServerMessage) {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(message));
	}
}

function broadcastToAll(message: ServerMessage) {
	server.clients.forEach((client) => {
		send(client as ClientSocket, message);
	});
}

function broadcastToOthers(sender: ClientSocket, message: ServerMessage) {
	server.clients.forEach((client) => {
		if (client !== sender) {
			send(client as ClientSocket, message);
		}
	});
}

// === Server Setup ===
const server = new WebSocketServer({ port: PORT });
console.log(`WebSocket server listening on port ${PORT}.`);

// === Event Handlers ===
server.on('connection', (ws, request) => {
	const socket = ws as ClientSocket;
	const ip = request.socket.remoteAddress;
	const port = request.socket.remotePort;

	socket.clientId = `${ip}:${port}`;
	socket.isAlive = true;

	socket.on('pong', () => {
		socket.isAlive = true;
	});

	console.log(`Client connected: ${socket.clientId}.`);

	send(socket, {
		type: 'system',
		content: `You have connected to the server. Your IP is ${socket.clientId}.`
	});

	broadcastToOthers(socket, {
		type: 'user_connected',
		clientId: socket.clientId
	});

	socket.on('message', (data) => {
		let parsed: ClientMessage;
		try {
			parsed = JSON.parse(data.toString());
		} catch {
			console.log('Invalid message received, ignoring.');
			return;
		}

		if (parsed.type === 'chat') {
			console.log(`Message from ${socket.clientId}: ${parsed.content}`);
			broadcastToAll({
				type: 'chat',
				sender: socket.clientId,
				content: parsed.content,
				timestamp: new Date().toISOString()
			});
		}
	});

	socket.on('close', () => {
		console.log(`Client disconnected: ${socket.clientId}.`);
		broadcastToOthers(socket, {
			type: 'user_disconnected',
			clientId: socket.clientId
		});
	});
});

// === Heartbeat ===
const heartbeatInterval = setInterval(() => {
	server.clients.forEach((ws) => {
		const socket = ws as ClientSocket;
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
