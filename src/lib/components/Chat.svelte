<script lang="ts">
	import { onMount } from 'svelte';
	import type { ClientMessage, ServerMessage } from '$lib/types/websocket.js';

	let socket: WebSocket | null = null;
	let connectionState = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	let status = $state('You are disconnected from the server.');
	let messages: string[] = $state([]);
	let messageInput = $state('');
	let wasConnected = false;

	function handleMessage(msg: ServerMessage) {
		switch (msg.type) {
			case 'chat':
				messages.push(`${msg.sender}: ${msg.content}`);
				break;
			case 'system':
				messages.push(msg.content);
				break;
			case 'user_connected':
				messages.push(`${msg.clientId} has connected.`);
				break;
			case 'user_disconnected':
				messages.push(`${msg.clientId} has disconnected.`);
				break;
		}
	}

	function connect() {
		wasConnected = false;
		connectionState = 'connecting';
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

		status = 'Connecting to the server...';

		socket.addEventListener('open', () => {
			wasConnected = true;
			connectionState = 'connected';
			status = 'You are connected to the server.';
		});

		socket.addEventListener('message', (event) => {
			try {
				const msg: ServerMessage = JSON.parse(event.data);
				handleMessage(msg);
			} catch {
				messages.push(event.data);
			}
		});

		socket.addEventListener('close', () => {
			connectionState = 'disconnected';
			status = 'You are disconnected from the server.';

			if (wasConnected) {
				messages.push('You have been disconnected from the server.');
			} else {
				messages.push('Could not connect to the server (it may be offline).');
			}

			socket = null;
		});
	}

	function send() {
		if (messageInput && socket) {
			const msg: ClientMessage = { type: 'chat', content: messageInput };
			socket.send(JSON.stringify(msg));
			messageInput = '';
		}
	}

	function toggleConnection() {
		if (connectionState === 'connected') {
			socket?.close();
		} else {
			connect();
		}
	}

	onMount(() => {
		connect();
	});
</script>

<div>
	<div>{status}</div>
	<button onclick={toggleConnection} disabled={connectionState === 'connecting'}>
		{#if connectionState === 'connecting'}
			Connecting...
		{:else if connectionState === 'connected'}
			Disconnect
		{:else}
			Connect
		{/if}
	</button>
</div>

<div>
	<input
		type="text"
		placeholder="Send a message to the server"
		bind:value={messageInput}
		onkeydown={(e) => e.key === 'Enter' && send()}
		disabled={connectionState !== 'connected'}
	/>
	<button onclick={send} disabled={connectionState !== 'connected'}>Send</button>
</div>

<h3>Messages:</h3>
<div>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
