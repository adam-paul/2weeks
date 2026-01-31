# 2weeks - Product Roadmap

## Vision

2weeks is a public knowledge platform where humans and AI models hold conversations that anyone can read, join, and correct. It replaces the collapsing StackOverflow model (210k monthly questions at peak, near-zero by late 2024) with something native to the AI era: structured conversations between people and language models, curated and corrected by domain experts, visible to everyone in crowdsourced fashion.

The core loop: someone starts a conversation (a question, a problem, an exploration). AI participates as a first-class entity. Experts and other users observe, reply, fork threads, vote on quality, and correct errors. The result is a public artifact -- richer than a Q&A pair, more trustworthy than a private chat transcript, and more useful than either.

## Problem Space

Three problems converge:

**1. AI siloing.** Every person's AI conversations happen in private. Insights, explanations, debugging sessions, conceptual breakthroughs -- all locked in individual chat windows, invisible to the broader community. StackOverflow (and StackExchange more broadly) made programming (and other) knowledge public by default. AI chat made it private by default. The net effect is a loss of shared knowledge infrastructure. We need to go back.

**2. Gell-Mann amnesia at scale.** Language models are convincing enough that only domain experts reliably catch their errors. But no individual is an expert in more than a few domains. In private chat, there's no mechanism for the right expert to see and correct the wrong answer. A public platform with the right structure routes expert attention to where it's needed -- the same dynamic that made StackOverflow's crowdsourced quality control work.

**3. Training data exhaustion.** The open web has largely been consumed as training data. What remains is increasingly synthetic or AI-generated. A platform that produces high-quality human-AI-expert conversations at scale -- with corrections, disagreements, and nuance -- generates genuinely novel training signal. This is a byproduct of a useful product, not a goal unto itself, but it's a significant one.

## Core Product Concepts

These are the nouns of the system -- the primitives everything else is built from.

**Conversation.** The primary unit. Has a title, tags, a creator, and a status (open/resolved/archived). Replaces StackOverflow's "question" but is more fluid -- it's a dialogue, not a prompt-and-response.

**Message.** A single contribution to a conversation. Can be from a human or an AI. Messages are the atoms of the system.

**Thread.** A branching reply chain off any message. This is how sub-discussions, corrections, and tangents are structured -- similar to how StackOverflow answers had comment threads, but more first-class.

**Correction.** A special type of response that marks an AI message (or any message) as containing an error, provides the fix, and explains the reasoning. Corrections are high-value artifacts -- they're exactly the kind of content that doesn't exist anywhere else and is most useful for both human readers and model training.

**Vote.** Crowdsourced quality signal on messages and corrections. Surfaces the best contributions.

**Reputation.** Accumulated from contributions, corrections, and votes received. Establishes expertise and trust. Not gamification for its own sake -- functional authority that influences how corrections are weighted and displayed.

**Tag.** Categorization for conversations. Enables routing: experts subscribe to tags in their domain, which is how the right eyes find the right conversations.

## Architecture

### Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | The codebase will grow significantly. Type safety pays for itself at scale. A learning opportunity in itself. |
| Frontend | SvelteKit | SSR for SEO (public knowledge base must be crawlable). Fast, lean, good DX. Preferred stack. |
| Runtime | Bun | Already in use. Fast, good TS support, Node-compatible. |
| Database | PostgreSQL | Relational data (users, conversations, messages, votes, tags). Mature full-text search. Scales well. Right tool for the job. |
| Real-time | WebSocket (ws) | Already have the foundation. Handles live conversation updates, presence, notifications. |
| AI | LLM APIs (Anthropic, OpenAI, Gemini, etc.) | AI participates via API calls. Streamed responses relayed through WebSocket. |
| Deployment | DigitalOcean VPS | Already set up. Simple to reason about. Migrate later if needed. |
| Proxy/TLS | nginx + Let's Encrypt | Already configured. Handles static files, TLS termination, WebSocket upgrade. |
| CI/CD | GitHub Actions | Already configured. Push-to-deploy pipeline. |

### System Design

Two processes on the VPS, sharing the same database:

```
                         nginx (443)
                        /          \
                       /            \
               SvelteKit (3000)    WebSocket Server (8080)
              pages, API, auth      real-time messaging
              SSR, REST             presence, streaming
                       \            /
                        \          /
                       PostgreSQL (5432)
```

**SvelteKit** handles the web application: page rendering, REST API routes, authentication, form submissions, and database reads/writes for non-real-time operations. This is where the bulk of the application logic lives.

**WebSocket server** handles real-time: live message delivery in active conversations, AI response streaming, typing indicators, presence. It evolves from the current server.js but becomes a structured message router connected to the database.

**nginx** routes `/ws` to the WebSocket server (already does this) and everything else to SvelteKit. Static assets served directly.

This two-process architecture preserves the existing nginx/WebSocket pattern, adds the web application layer cleanly, and keeps concerns separated. Both processes can be managed independently via systemd.

### Schema (Conceptual)

```
users
  id, username, email, password_hash, reputation, created_at

conversations
  id, title, creator_id, status, created_at, updated_at

messages
  id, conversation_id, author_id, parent_id (threading),
  content, author_type (human/ai), model (if ai), created_at

corrections
  id, message_id, author_id, original_content,
  corrected_content, explanation, created_at

votes
  id, target_type (message/correction), target_id,
  user_id, value (+1/-1), created_at

tags
  id, name, description

conversation_tags
  conversation_id, tag_id
```

This is deliberately minimal. It will grow, but these entities capture the core product primitives. Notably: `messages.parent_id` enables threading as a self-referential foreign key, and `messages.author_type` distinguishes human from AI contributions at the data level.

## Roadmap

Each phase is a self-contained deliverable. No timelines -- just sequence and dependencies. The phases are structured as learning progressions consistent with the project's Socratic approach: each one introduces new concepts and tools while building on the previous foundation.

---

### Phase 0: Application Skeleton

**Goal:** Replace the vanilla prototype with a proper application shell. Learn SvelteKit, TypeScript, PostgreSQL, and ORM fundamentals.

**What changes:**
- Initialize a SvelteKit project in the repo (replaces index.html + client.js as the frontend)
- Add TypeScript
- Set up PostgreSQL locally and on the VPS
- Implement basic schema (users table to start)
- Add authentication (email/password; OAuth later)
- Structured WebSocket protocol (JSON messages with `type` field, replacing plain strings)
- Update CI/CD pipeline for the new build process (SvelteKit build step)
- Update nginx config to proxy to SvelteKit

**What carries forward from current codebase:**
- nginx + VPS + systemd setup
- WebSocket server process (refactored, not rewritten from scratch)
- GitHub Actions pipeline (extended)
- Heartbeat mechanism
- The domain and DNS

**Key learning:** SvelteKit project structure, server-side rendering, TypeScript basics, relational database design, SQL fundamentals, authentication patterns.

---

### Phase 1: Persistent Conversations

**Goal:** Users can create, browse, and participate in conversations that persist across sessions.

**What gets built:**
- Conversation CRUD via SvelteKit API routes
- Message persistence (every message stored in PostgreSQL)
- Conversation list page (browse recent conversations)
- Single conversation view with full message history
- Real-time message delivery (WebSocket pushes new messages to all viewers)
- User identity in messages (username, not IP:port)
- Basic conversation page layout

**Core UX flow:** Visit site -> browse conversations -> click into one -> see history -> send a message -> others see it in real-time. Or: create a new conversation -> give it a title -> start talking.

**Key learning:** Database queries from SvelteKit, real-time sync between HTTP and WebSocket, state management in Svelte stores, form handling.

---

### Phase 2: AI Participants

**Goal:** AI joins conversations as a first-class participant. This is where the product differentiates from a plain chat app.

**What gets built:**
- LLM API integration (start with Anthropic Claude)
- AI invocation mechanism (explicit @ai mention, or configurable auto-respond)
- Conversation history fed as context to the LLM
- Streamed AI responses relayed through WebSocket (tokens appear in real-time)
- Visual distinction between human and AI messages
- AI message metadata (which model, token count)

**Key design decision:** How is AI invoked? Options range from "always present, responds to everything" to "explicitly summoned." Starting with explicit invocation (@ai or a button) is safer -- it keeps humans in control and avoids noise. Can evolve.

**Key learning:** LLM API integration, streaming responses, server-sent events vs. WebSocket for streaming, prompt construction, context window management.

---

### Phase 3: Threading & Corrections

**Goal:** Enable the collaborative correction model. This is the core differentiator.

**What gets built:**
- Threaded replies on any message (message.parent_id)
- Correction UI: mark a message as containing an error, provide the fix, explain why
- Display original vs. corrected content (inline diff or toggle)
- Basic voting on messages and corrections (+1/-1)
- Conversation tagging (creator assigns tags)
- Thread-level collapsing/expanding in the UI

**This phase is where 2weeks stops being "a chat app" and starts being "a knowledge platform."** Corrections are first-class content, not comments. A corrected AI response is more valuable than either the original AI response or a standalone human answer -- it captures the error, the fix, and the reasoning.

**Key learning:** Recursive data structures (threaded messages), diff rendering, optimistic UI updates, voting systems, data modeling for polymorphic associations.

---

### Phase 4: Discovery & Reputation

**Goal:** Make content findable and establish trust signals.

**What gets built:**
- Full-text search (PostgreSQL `tsvector` to start; semantic search later)
- Tag-based browsing and filtering
- User profiles with contribution history
- Reputation system (earned from corrections, upvotes received, conversation contributions)
- Expert verification: high-reputation users' corrections carry more visual weight
- SEO optimization (clean URLs, meta tags, structured data for conversation pages)
- RSS/feeds for tags

**Why this comes after corrections, not before:** Discovery only matters once there's content worth discovering. Search and reputation are amplifiers, not generators. Build the content creation loop first.

**Key learning:** Full-text search indexing, PostgreSQL text search configuration, SEO with SvelteKit, reputation algorithm design, caching strategies.

---

### Phase 5: Scale & Polish

**Goal:** Production-grade platform that can handle real users.

**What gets built:**
- Multiple AI model support (user or conversation-level model selection)
- Real-time notifications (new replies to your conversations/threads)
- Moderation tools (flag, hide, ban)
- Rate limiting and abuse prevention
- Performance: pagination, cursor-based scrolling, database indexing, static asset CDN
- Email notifications (digest of activity in subscribed tags)
- Mobile-responsive UI
- API for third-party access

**Open question:** At this scale, the single-VPS architecture may need to evolve. Options include vertical scaling (bigger droplet), adding a read replica, moving static assets to a CDN (Cloudflare), or migrating compute to Cloudflare Workers / Railway. This decision depends on actual traffic patterns and can be deferred.

**Key learning:** Performance profiling, database optimization, caching layers, notification architecture, rate limiting patterns, responsive design.

---

## Current State

The project today is a working WebSocket chat application with:
- Bun + ws server with heartbeat (server.js, 72 lines)
- Vanilla JS client with connect/disconnect and messaging (client.js, 69 lines)
- Vite dev server with WebSocket proxy
- Production deployment on DigitalOcean VPS with nginx, systemd, SSL
- GitHub Actions CI/CD pipeline
- Three checkpoint documents covering WebSocket fundamentals, production deployment, and connection reliability

The code itself will be substantially replaced as the project evolves (SvelteKit replaces the vanilla frontend, the server gets restructured), but the infrastructure, deployment pipeline, domain, and -- most importantly -- the conceptual understanding carry forward directly.

## Open Questions

These don't need answers now. They'll resolve as the product takes shape.

- **Conversation model details.** When does a conversation "close"? Can it be reopened? Is there a concept of "resolved" like StackOverflow's accepted answer? Or is it more fluid?
- **AI invocation model.** Always-on AI in every conversation? Opt-in per conversation? Summoned by @-mention? This affects the feel of the platform significantly.
- **Identity and anonymity.** Real names? Pseudonyms? Anonymous posting? StackOverflow used pseudonyms with reputation. That probably works here too.
- **Moderation philosophy.** Community-driven (flags + reputation-based privileges)? Or centralized? StackOverflow's community moderation worked well at scale.
- **Revenue model.** Training data licensing? Premium features? API access? Ads? This can wait, but it's worth thinking about early since it affects data ownership and terms of service.
- **Content licensing.** StackOverflow used CC BY-SA. What license covers conversations that include AI-generated content? This has legal nuance.
- **Multi-AI dynamics.** Could a conversation include multiple AI models that respond to each other? Users compare and correct different models' takes? Interesting but complex.
- **The "2-week course" dimension.** The domain name originates from the idea of curating knowledge into intensive learning paths. The concept: once a conversation reaches a conclusion, accumulates enough reputation, or crosses some other set of thresholds, it crystallizes into a *consumable* -- not just a conversation to read through, but a transformed product closer to a textbook chapter or structured educational resource. The specifics of what this looks like aren't defined yet (how is a conversation transformed? what does the output format look like? what are the thresholds?), but the idea is that the platform doesn't just *contain* knowledge, it *produces* packaged knowledge as a downstream output. This layer can be built entirely on top of the core conversation platform described in Phases 0-5, potentially even after that foundation is fully in production. Worth keeping in mind as a north star -- and worth noting that the data model decisions made in early phases (tags, resolution status, correction quality, vote thresholds) are the raw inputs that would eventually feed whatever crystallization logic determines when a conversation is course-worthy.
