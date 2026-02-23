// Client -> Server
export type ClientMessage = {
	type: 'chat';
	content: string;
};

// Server -> Client
export type ServerMessage =
	| { type: 'chat'; sender: string; content: string; timestamp: string }
	| { type: 'system'; content: string }
	| { type: 'user_connected'; clientId: string }
	| { type: 'user_disconnected'; clientId: string };
