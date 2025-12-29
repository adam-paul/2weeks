# Checkpoint 1: WebSocket Chat Architecture

## Architecture Overview

### Stack
- **Server**: Bun runtime with `ws` library
- **Client**: Vanilla HTML/JavaScript with native WebSocket API
- **Protocol**: WebSocket on port 8080

### Files

| File | Purpose |
|------|---------|
| `server.js` | WebSocket server with broadcasting and client identification |
| `client.js` | Browser client with connection management and UI logic |
| `client.html` | Minimal UI structure |

### Server (`server.js`)

**Components:**
- `WebSocketServer` instance listening on port 8080
- `broadcastToAll(message)` — sends to every connected client
- `broadcastToOthers(sender, message)` — sends to all except sender

**Connection Handling:**
- Extracts client IP and ephemeral port from `request.socket`
- Stores identifier as `socket.clientId` (custom property)
- Sends personalized welcome message to new client
- Notifies other clients of new connection

**Event Handlers:**
- `'message'`: Broadcasts received message to all clients with sender's clientId prefix
- `'close'`: Logs disconnection, notifies other clients

### Client (`client.js`)

**State:**
- `socket` — current WebSocket connection (reassignable)
- `wasConnected` — tracks if connection ever opened (for error differentiation)

**DOM References:**
- `statusElement`, `sendButton`, `connectButton`, `messageInput`, `messageStream`

**Functions:**
- `addMessage(message)` — appends message as `<p>` to message stream
- `connect()` — creates WebSocket, attaches event handlers, resets `wasConnected`

**Connection Logic:**
- Toggle button switches between connect/disconnect based on `socket.readyState`
- Differentiates "couldn't connect" from "was connected then disconnected"

### Client (`client.html`)

**UI Elements:**
- Status display (connected/disconnected)
- Connect/Disconnect toggle button
- Text input with Send button (disabled when disconnected)
- Messages display area

### Data Flow

1. Client sends message via `socket.send()`
2. Server receives on `socket.on('message')`
3. Server calls `broadcastToAll()` with clientId prefix
4. All clients receive via `'message'` event listener
5. Each client appends to DOM via `addMessage()`

---

## Comprehension Quiz

### Question 1: WebSocket vs HTTP (Score: 0.8)

**Q:** Look at lines 28 and 35 of server.js where the server initiates messages to clients. Could you achieve the same behavior using plain HTTP?

**A:** No. HTTP is request/response only — the client asks, the server answers, then the connection closes. The server cannot initiate communication without the client first asking. Before WebSockets, developers used polling (wasteful) or long-polling (hacky) as workarounds. WebSockets maintain a persistent, bidirectional channel where either side can send at any time.

*User correctly identified the request/response limitation after working through initial uncertainty.*

---

### Question 2: Nested Event Handlers (Score: 0.9)

**Q:** Why are the `'message'` and `'close'` handlers defined inside the `'connection'` handler, not at the top level of the file?

**A:** Two reasons:
1. **Scope**: `socket` is a parameter of the connection callback — it only exists inside that function
2. **Per-client handlers**: Each connection creates a new socket object; handlers attach to that specific socket via closure

*User identified both key points: scope constraints and per-client handler attachment.*

---

### Question 3: The `wasConnected` Pattern (Score: 1.0)

**Q:** Why do we need `wasConnected`? The `'close'` event fires when the connection closes — why isn't that enough?

**A:** The `'close'` event is stateless — it just says "connection ended" without knowing if `'open'` ever fired. `wasConnected` tracks that history:
- Reset to `false` at start of `connect()`
- Set to `true` when `'open'` fires
- Checked in `'close'` handler to distinguish "couldn't connect" from "was connected then disconnected"

*User explained perfectly, including appropriate awareness of potential edge cases.*

---

### Question 4: `let` vs `const` for Socket (Score: 0.9)

**Q:** Why is `socket` declared with `let` while DOM references use `const`?

**A:** `socket` needs reassignment — each reconnection creates a new WebSocket object (they're single-use; once closed, can't reopen). DOM references never change; they point to the same elements throughout.

Additionally, `socket` is at file-level scope because multiple functions need access (send handler, connect button handler). Creating it inside `connect()` would make it inaccessible elsewhere.

Side effects matter too: `new WebSocket(...)` immediately attempts connection, so you can't initialize it at declaration like a primitive.

*User understood reassignment need and asked excellent follow-up questions about scope.*

---

### Question 5: The `readyState` Check (Score: 0.7)

**Q:** In `broadcastToAll`, you check `client.readyState === WebSocket.OPEN` before sending. If clients are in `server.clients`, aren't they connected?

**A:** WebSocket has four states: CONNECTING (0), OPEN (1), CLOSING (2), CLOSED (3). The `ws` library removes clients from `server.clients` only when they reach CLOSED, not during CLOSING. During the close handshake, a client is still in the set but cannot receive messages. The check protects against this real timing window.

*User initially uncertain but understood after explanation of the CLOSING state window.*

---

### Question 6: The `request` Parameter (Score: 0.9)

**Q:** What is `request` in the connection handler, and why is it only available there?

**A:** `request` is the HTTP upgrade request — the initial HTTP request that negotiates the WebSocket connection. It's an `http.IncomingMessage` object with headers, URL, method, and the underlying TCP socket.

It's only relevant during the connection handshake. After upgrade, communication uses WebSocket protocol, not HTTP. The `request` is technically still accessible via closure in nested handlers, but serves no purpose post-handshake.

*User correctly identified HTTP upgrade request and understood post-upgrade irrelevance.*

---

### Question 7: Event Loop (Score: 1.0)

**Q:** The script runs top-to-bottom and ends at line 43. Why doesn't the process exit?

**A:** The JavaScript runtime (Bun) runs an event loop that stays alive as long as there are active listeners, pending timers, or open connections. The WebSocketServer listening on port 8080 is an active listener, so the event loop continues waiting for events indefinitely.

*User answered correctly and concisely.*

---

### Question 8: Truthy/Falsy Check (Score: 0.6)

**Q:** The send handler uses `if (message)`. What values would fail this check, and why use this instead of `if (message !== '')`?

**A:** Falsy values in JavaScript: `false`, `0`, `""`, `null`, `undefined`, `NaN`. Since `messageInput.value` always returns a string, only empty string `""` applies here.

`if (message)` and `if (message !== '')` are functionally identical for this case. The short form is idiomatic JavaScript — a convention for "if there's something here."

*User had correct intuition but was uncertain about the mechanics.*

---

### Question 9: Client Identification (Score: 0.7)

**Q:** Why use both IP and port for `clientId`? And how can you attach `clientId` to the socket object when `ws` doesn't define it?

**A:**
1. In local testing, all clients share the same IP (`::1` or `127.0.0.1` — localhost). Even in production, clients behind NAT share IPs. The ephemeral port (assigned by OS per connection) makes each connection unique.

2. JavaScript allows adding arbitrary properties to objects. By attaching `clientId` to the socket, it's accessible anywhere the socket is accessible — including in `broadcastToAll` when iterating `server.clients`, which wouldn't have access to local variables from the connection handler's closure.

*User was uncertain about IPv6/localhost but understood port differentiation and property attachment.*

---

### Question 10: Complete Message Trace (Score: 0.95)

**Q:** Trace a message from Client A clicking Send to both Client A and Client B seeing it displayed.

**A:**
1. Client A clicks Send button
2. Click handler reads `messageInput.value` into `message` variable
3. Truthy check passes, `socket.send(message)` fires, input resets
4. WebSocket sends data frame to server on port 8080
5. Server's `socket.on('message')` fires for Client A's socket
6. Handler converts data to string, calls `broadcastToAll()` with `${socket.clientId}: ${message}`
7. `broadcastToAll` iterates `server.clients`, checks each is OPEN, calls `client.send()`
8. Both Client A and B receive the message; their `'message'` event listeners fire
9. Each calls `addMessage(event.data)`
10. `addMessage` creates `<p>` element, sets `textContent`, appends to `messageStream`
11. Both clients see the message in their respective UIs

*Excellent comprehensive trace with only minor technical imprecisions.*

---

## Summary

**Total Score: 8.45 / 10**

**Strong Areas:**
- Event-driven architecture and closures
- State management patterns
- Overall system understanding

**Areas for Reinforcement:**
- JavaScript truthy/falsy mechanics
- WebSocket connection states
- Network fundamentals (IP/port addressing)
