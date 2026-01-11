# Checkpoint 2: Production Deployment

## Architecture Overview

### Production Stack
- **VPS**: DigitalOcean Droplet (Ubuntu 24.04 LTS)
- **Web Server**: nginx (static files + reverse proxy)
- **Runtime**: Bun
- **Process Manager**: systemd
- **SSL**: Let's Encrypt via certbot
- **Domain**: 2weeks.ca (GoDaddy DNS)

### Development Stack
- **Dev Server**: Vite (with WebSocket proxy)
- **Runtime**: Bun

### Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (VPS)                                     │
│  Ubuntu 24.04 LTS                                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  nginx (web server)                                       │  │
│  │  - Listens on port 80 → redirects to HTTPS                │  │
│  │  - Listens on port 443 (SSL via Let's Encrypt)            │  │
│  │  - Serves static files from /var/www/2weeks/              │  │
│  │  - Proxies /ws to localhost:8080                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  server.js (WebSocket server)                             │  │
│  │  - Managed by systemd (websocket-server.service)          │  │
│  │  - Auto-restarts on failure                               │  │
│  │  - Logs to systemd journal                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Domain: 2weeks.ca → VPS IP (via GoDaddy DNS A record)          │
└─────────────────────────────────────────────────────────────────┘
```

### Files

**Local Development:**

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML (renamed from client.html) |
| `client.js` | Client-side JS with protocol detection |
| `server.js` | WebSocket server (unchanged from checkpoint 1) |
| `package.json` | Scripts: dev, dev:server, build, preview |
| `vite.config.js` | Dev server with WebSocket proxy configuration |

**Production (VPS):**

| Path | Purpose |
|------|---------|
| `/var/www/2weeks/` | Static files (index.html, client.js, server.js) |
| `/etc/nginx/sites-available/2weeks` | nginx site configuration |
| `/etc/systemd/system/websocket-server.service` | Process management |
| `/etc/letsencrypt/live/2weeks.ca/` | SSL certificates |

---

## Key Changes from Checkpoint 1

### client.js

**WebSocket URL** — Now uses dynamic protocol and host:

```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
```

**Connection state handling** — Button disabled during connection attempts:

```javascript
statusElement.textContent = "Connecting to the server...";
connectButton.textContent = "Connecting...";
connectButton.disabled = true;
```

### index.html (renamed from client.html)

**Script loading** — Now uses ES modules for Vite compatibility:

```html
<script type="module" src="/client.js"></script>
```

### New Files

**vite.config.js** — Development server with WebSocket proxy:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "bun run server.js",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## Development Workflow

### Local Development

1. Start WebSocket server: `bun dev:server`
2. Start Vite dev server: `bun dev`
3. Open `http://localhost:5173`
4. Vite proxies `/ws` requests to `localhost:8080`

### Deployment

1. Transfer files: `scp index.html client.js server.js package.json root@VPS_IP:/var/www/2weeks/`
2. SSH into VPS: `ssh root@VPS_IP`
3. Install dependencies: `cd /var/www/2weeks && bun install --production`
4. Restart server: `systemctl restart websocket-server`

---

## Concepts Covered

### Infrastructure

- **VPS (Virtual Private Server)**: Rented slice of physical hardware running its own OS
- **Droplet**: DigitalOcean's branded term for VPS
- **SSH**: Secure Shell protocol for remote server access
- **Static vs Application hosting**: File serving vs running code

### Web Server (nginx)

- **Static file serving**: Sending files from disk in response to HTTP requests
- **Reverse proxy**: Forwarding requests to backend services
- **TLS termination**: Handling encryption/decryption at the edge
- **sites-available/sites-enabled**: Debian/Ubuntu pattern for managing site configs
- **Server blocks**: nginx configuration for virtual hosts

### DNS

- **Domain registrar**: Where you purchase/own domains (GoDaddy)
- **A record**: Maps domain name to IPv4 address
- **Nameservers**: Authoritative DNS servers for a domain
- **DNS propagation**: Time for DNS changes to spread globally

### SSL/TLS

- **HTTPS/WSS**: HTTP/WebSocket over TLS (encrypted)
- **Certificate**: Proves server identity, contains public key
- **Certificate Authority (CA)**: Trusted entity that signs certificates
- **Let's Encrypt**: Free, automated CA
- **certbot**: Tool for obtaining and installing Let's Encrypt certificates
- **HTTP-01 challenge**: Domain verification by serving a token file

### Process Management (systemd)

- **Unit file**: Configuration for a systemd service
- **Service lifecycle**: start, stop, restart, enable, disable
- **Auto-restart**: `Restart=on-failure` for resilience
- **journalctl**: Viewing systemd service logs

### Development Tooling

- **Vite**: Modern frontend dev server and build tool
- **Dev server proxy**: Forwarding requests during development
- **ES modules**: Modern JavaScript module system (`type="module"`)
- **devDependencies**: Packages needed only for development

### Networking Fundamentals

- **Privileged ports**: Ports below 1024 require root
- **TCP retry behavior**: Exponential backoff on unreachable hosts
- **RST packet**: Immediate connection refusal (nothing listening)
- **Connection timeout**: Slow failure when no response received

---

## Comprehension Quiz

### Question 1: VPS vs Managed Platforms (Score: 0.85)

**Q:** We chose a VPS (DigitalOcean Droplet) over static hosting services like GitHub Pages. What fundamental characteristic of our application made this necessary?

**A:** Static hosting only serves files — it doesn't execute code. Our WebSocket server requires a continuously running process that executes JavaScript, maintains state in memory (connected clients), and holds persistent TCP connections. This requires an application server, not just file serving. We also chose VPS over managed platforms like Heroku for didactic purposes — to understand the full stack.

*User correctly identified the process/state requirements. Slightly fuzzy on terminology ("web server" vs "application server").*

---

### Question 2: nginx's Role (Score: 0.80)

**Q:** In our production setup, nginx listens on port 443 while server.js listens on port 8080. Why this architecture?

**A:** nginx serves as both reverse proxy and static file server. It handles routing, static files, and proxies WebSocket connections to server.js. This separation of concerns avoids bloating server.js with HTTP/file-serving logic.

Additionally:
- Port 443 is privileged (requires root) — nginx handles this safely
- nginx performs TLS termination (encryption/decryption)
- nginx is optimized for static file serving and connection handling

*User identified separation of concerns but missed port privileges and TLS termination details.*

---

### Question 3: WebSocket Proxy Headers (Score: 0.90)

**Q:** Why are the `Upgrade` and `Connection` headers necessary in the nginx WebSocket proxy config?

**A:** WebSocket starts as an HTTP request with headers asking to "upgrade" the protocol. Since nginx intercepts all traffic, it must pass these headers through to server.js; otherwise, the upgrade never happens and WebSocket fails. By default, nginx strips the `Connection` header (hop-by-hop), so we explicitly set it.

*User correctly explained the upgrade mechanism and why nginx must forward the headers.*

---

### Question 4: DNS Resolution (Score: 0.70)

**Q:** Describe the sequence of lookups/connections when a user visits https://2weeks.ca.

**A:** User's summary was directionally correct but fuzzy on DNS mechanics. The correct sequence:

1. Browser parses URL (protocol, host, port)
2. DNS resolution: Browser → DNS server → Root → .ca TLD → GoDaddy nameservers → returns IP
3. TCP connection to IP:443
4. TLS handshake with nginx
5. HTTP request over encrypted channel
6. nginx serves index.html

*User mentioned CDN (not in our setup) and was vague about DNS hierarchy.*

---

### Question 5: Certificate Verification (Score: 0.95)

**Q:** How does Let's Encrypt verify domain ownership, and why must DNS already point to your server?

**A:** certbot requests a certificate, and Let's Encrypt provides a challenge token. certbot creates a file at `/.well-known/acme-challenge/`. Let's Encrypt fetches this URL. Since DNS points to our VPS, only our server can respond. If DNS pointed elsewhere, our certbot couldn't answer the challenge.

The security: only someone who controls both DNS and server access can get a certificate.

*Excellent comprehensive answer including the security model. Minor clarification: certbot creates the file, not Let's Encrypt.*

---

### Question 6: systemd Auto-restart (Score: 0.85)

**Q:** Why is automatic restart important for a WebSocket server specifically?

**A:** WebSocket connections are persistent and stateful. If the server crashes:
- All existing connections terminate
- Users see "disconnected"
- Any in-memory state is lost
- New connection attempts fail

Auto-restart (`Restart=on-failure`) ensures downtime is ~5-10 seconds instead of hours (until manual intervention).

*User understood the core concept. Could have elaborated more on user experience during failure.*

---

### Question 7: TCP Connection Behavior (Score: 0.95)

**Q:** During VPS reboot, connection attempts hung instead of failing immediately. Why?

**A:** Three scenarios with different failure speeds:

1. **Localhost, nothing listening**: Kernel knows immediately → sends RST → instant failure
2. **VPS up, server.js down**: nginx returns 502 → fast failure
3. **VPS unreachable**: No response → TCP retries with exponential backoff → 30-60s timeout

The production bug: during rebooting, nothing responds, so TCP retries. Multiple button clicks created multiple sockets in CONNECTING state. When VPS returned, all connected simultaneously.

*Excellent answer with accurate technical detail.*

---

### Question 8: Dev/Prod Proxy (Score: 0.85)

**Q:** Why does the same client.js code work in both development and production?

**A:** The code uses dynamic URL construction:

```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
```

This adapts to transport security (not environment). The `/ws` path is proxied in both setups:
- Dev: Vite proxies to localhost:8080
- Prod: nginx proxies to 127.0.0.1:8080

*User understood the mechanism. Minor clarification: it's transport-security detection, not strictly local-vs-production.*

---

## Summary

**Total Score: 6.85 / 8 = 85.6%**

**Strong Areas:**
- TLS/Certificate mechanics
- TCP behavior and debugging
- WebSocket protocol details
- Process management concepts

**Areas for Reinforcement:**
- DNS resolution chain (hierarchy of queries)
- nginx responsibilities (port privileges, TLS termination)
- Precise networking terminology (RST packets, hop-by-hop headers)

---

## Next Steps (Potential)

1. **Usernames**: Replace IP:port with human-readable names (JSON messages)
2. **Reconnection logic**: Auto-retry with exponential backoff
3. **Message persistence**: Store chat history (requires database)
4. **Rooms/channels**: Multiple chat rooms
5. **CI/CD**: Automated deployment pipeline
6. **Monitoring**: Health checks, uptime alerts
