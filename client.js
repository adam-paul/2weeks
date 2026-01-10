let socket;

const statusElement = document.getElementById('status');
const sendButton = document.getElementById('sendButton');
const connectButton = document.getElementById('connectButton');
const messageInput = document.getElementById('messageInput');
const messageStream = document.getElementById('messageStream');

function addMessage(message) {
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  messageStream.appendChild(messageElement);
}

function connect() {
  let wasConnected = false;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

  statusElement.textContent = "Connecting to the server...";
  connectButton.textContent = "Connecting...";
  sendButton.disabled = true;
  connectButton.disabled = true;

  socket.addEventListener('open', () => {
    wasConnected = true;
    statusElement.textContent = "You are connected to the server.";
    sendButton.disabled = false;
    connectButton.textContent = "Disconnect";
    connectButton.disabled = false;
  });

  socket.addEventListener('message', (event) => {
    addMessage(event.data);
  });

  socket.addEventListener('close', () => {
    statusElement.textContent = "You are disconnected from the server.";
    sendButton.disabled = true;
    connectButton.textContent = "Connect";
    connectButton.disabled = false;

    if (wasConnected) {
      addMessage("You have been disconnected from the server.");
    } else {
      addMessage("Could not connect to the server (it may be offline).");
    }
  });
}

sendButton.addEventListener('click', () => {
  const message = messageInput.value;

  if (message) {
    socket.send(message);
    messageInput.value = '';
  }
});

connectButton.addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  } else {
    connect();
  }
});

connect();
