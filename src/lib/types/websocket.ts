// Client -> Server
export type ClientMessage = {
	type: 'chat';
	content: string;
};

// Server -> Client
export type ServerMessage =
	| { type: 'chat'; sender: string; content: string; timestamp: string }
	| { type: 'system'; content: string }
	| { type: 'user_joined'; clientId: string }
	| { type: 'user_left'; clientId: string };
