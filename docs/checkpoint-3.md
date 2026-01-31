# Checkpoint 3: Heartbeat & CI/CD

## Architecture Overview

### Changes from Checkpoint 2

| Component | Before | After |
|-----------|--------|-------|
| Connection persistence | Silent connections timed out by nginx (~60s) | Heartbeat keeps connections alive indefinitely |
| Dead client detection | Only `'close'` event (misses half-open connections) | Ping/pong probes detect unresponsive clients |
| Deployment | Manual `scp` + SSH + restart | Automated via GitHub Actions on push to master |
| Branching | Single `master` branch | `dev` for work, `master` for production |

### Production Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub                                                         │
│                                                                 │
│  ┌─────────────┐    push/merge     ┌──────────────────────┐    │
│  │ dev branch  │ ───────────────►  │ master branch        │    │
│  └─────────────┘                   └──────────────────────┘    │
│                                              │                  │
│                                    GitHub Actions triggers      │
│                                              │                  │
└──────────────────────────────────────────────│──────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet                                           │
│                                                                 │
│  GitHub Actions runner SSHs in and executes:                    │
│    cd /var/www/2weeks                                           │
│    git pull origin master                                       │
│    bun install --production                                     │
│    systemctl restart websocket-server                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  server.js (WebSocket server)                             │  │
│  │  - Heartbeat every 30s keeps connections alive            │  │
│  │  - Ping/pong detects and terminates dead clients          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Files

**New:**

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions workflow for automated deployment |

**Modified:**

| File | Change |
|------|--------|
| `server.js` | Added heartbeat mechanism (ping/pong + isAlive flag) |

---

## Key Changes

### server.js — Heartbeat Mechanism

**Configuration:**

```javascript
const HEARTBEAT_MS = 30000;
```

30 seconds — fast enough to beat nginx's default idle timeout (~60s), slow enough to not waste bandwidth.

**Per-connection state:**

```javascript
socket.isAlive = true;

socket.on('pong', () => {
  socket.isAlive = true;
});
```

Each socket tracks whether it's responsive. The `'pong'` event fires when the client responds to a ping.

**Heartbeat interval:**

```javascript
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
```

Every 30 seconds:
1. Check each client — if `isAlive` is still false from last cycle, terminate
2. Set `isAlive = false`
3. Send ping
4. If client responds with pong, `isAlive` becomes true before next check

**Cleanup:**

```javascript
server.on('close', () => {
  clearInterval(heartbeatInterval);
});
```

Prevents memory leak if server shuts down.

---

### deploy.yml — GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [master]
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/2weeks
            git pull origin master
            bun install --production
            systemctl restart websocket-server
            echo "Deploy complete: $(git log -1 --pretty=format:'%h - %s')"
```

**Triggers:**
- `push` to master — fires on direct push or PR merge
- `workflow_dispatch` — enables manual "Run workflow" button

**Secrets:**
- `VPS_HOST` — Droplet IP address
- `SSH_PRIVATE_KEY` — Private key for SSH access

**Deploy steps:**
1. Pull latest code from GitHub
2. Install/update dependencies
3. Restart the systemd service

---

## VPS Setup for Git-Based Deployment

To enable `git pull` on the VPS:

1. **Deploy key** — SSH keypair where VPS has private key, GitHub has public key (read-only)
2. **Clone repo** — `/var/www/2weeks` is now a git clone, not just scp'd files
3. **SSH config** — VPS configured to use deploy key for github.com

This replaces manual scp with `git pull` — the VPS pulls changes rather than having them pushed.

---

## Concepts Covered

### WebSocket Heartbeat

- **Idle timeout** — Reverse proxies (nginx) drop silent connections after a timeout
- **Half-open connections** — Client disappears without clean close; server thinks connection is alive
- **Ping/pong** — WebSocket protocol frames for connection liveness testing (not application messages)
- **Optimistic liveness** — "Assume dead until proven alive" pattern with `isAlive` flag
- **terminate() vs close()** — Immediate kill vs graceful handshake; use terminate for unresponsive clients

### CI/CD (Continuous Deployment)

- **GitHub Actions** — Workflow automation triggered by repository events
- **Workflow** — YAML file defining triggers, jobs, and steps
- **Runner** — Ephemeral VM (ubuntu-latest) that executes the job
- **Secrets** — Encrypted values for credentials; never commit secrets to code
- **workflow_dispatch** — Manual trigger for workflows
- **Pull-based deployment** — Server pulls code from remote vs push-based (scp/rsync)

### Git Workflow

- **Feature branches** — `dev` for development, `master` for production
- **PR merge = push** — Merging a PR creates a commit on the target branch, triggering push events
- **Deploy key** — Repo-specific SSH key with read-only access (more secure than personal access tokens)

---

## Comprehension Quiz

### Question 1: Why Heartbeat? (Score: 0.95)

**Q:** WebSocket connections are persistent. Why do we need a heartbeat mechanism? What problem does it solve that the `'close'` event doesn't?

**A:** Two problems:
1. **Proxy timeout** — nginx drops idle connections (~60s). Heartbeat creates activity that resets the timeout.
2. **Half-open connections** — If a client disappears without clean close (laptop lid, network drop), the `'close'` event never fires. Ping/pong actively probes the connection.

*User correctly identified both the proxy timeout and half-open connection problems with clear explanations.*

---

### Question 2: The isAlive Sequence (Score: 0.85)

**Q:** Why set `isAlive = false` before sending the ping, rather than after?

**A:** The pong handler's only job is to set `isAlive = true`. Each interval re-establishes liveness: assume dead, send ping, if pong arrives then proven alive. On next interval, if still false, terminate.

*User understood the core flow. Clarification added: setting false AFTER the ping creates a race condition where the pong could arrive and set true before we overwrite it with false.*

---

### Question 3: terminate() vs close() (Score: 0.95)

**Q:** Why use `terminate()` instead of `close()` for unresponsive clients?

**A:** `terminate()` severs immediately without a closing handshake. `close()` would require a handshake that an unresponsive client can't complete — it would hang waiting for acknowledgment.

*User correctly distinguished immediate termination from graceful shutdown and understood why the latter fails for dead connections.*

---

### Question 4: GitHub Actions Triggers (Score: 1.0)

**Q:** When you merge a PR to master, which trigger fires? What does `workflow_dispatch` provide?

**A:**
1. `push` — a PR merge is a push to the target branch
2. `workflow_dispatch` — enables manual triggering via GitHub UI, for testing or ad-hoc deploys

*User correctly identified that PR merge creates a push event and understood the manual trigger use case.*

---

### Question 5: Secrets (Score: 0.9)

**Q:** Why use GitHub Secrets instead of hardcoding values in the YAML?

**A:** Even in a private repo, hardcoding secrets is bad practice:
- Private repo is less secure than encrypted Secrets
- Sets bad habits for when repos become public or gain collaborators
- DRY — multiple workflows can reference the same secrets

*User covered the key points. Additional risks: git history is permanent (deleted secrets remain in history), and GitHub auto-redacts Secrets from logs.*

---

### Question 6: Deploy Failure Mode (Score: 1.0)

**Q:** What happens if `bun install` fails during deployment?

**A:** The script stops at the failure point. `systemctl restart` never executes, so the server keeps running old code. However, the filesystem has new code from `git pull`, creating a fragile state — a VPS restart would launch the potentially broken new code.

*Excellent analysis including the subtle mismatch between running process and filesystem state.*

---

## Summary

**Total Score: 5.65 / 6 = 94.2%**

**Strong Areas:**
- Heartbeat mechanics and failure modes
- CI/CD workflow triggers and secrets
- Understanding of deploy failure implications

**Areas for Reinforcement:**
- Race conditions in async patterns (isAlive sequence)

---

## Next Steps (Potential)

1. **Usernames** — Replace IP:port with human-readable names (JSON message protocol)
2. **Reconnection logic** — Client-side auto-retry with exponential backoff
3. **Health checks** — Verify server responds after deploy before considering success
4. **Atomic deploys** — Clone to temp directory, swap symlink only on success
5. **Message persistence** — Store chat history (requires database)
6. **Rooms/channels** — Multiple chat rooms
