# Sample Server Interaction

A walkthrough of a single user session that touches all three "server" roles in the application: `+page.server.ts` (data loading for pages), `+server.ts` (API endpoint), and `server/server.ts` (standalone WebSocket process).

---

## Step 1: User visits `/conversations`

The browser requests the page. SvelteKit finds `src/routes/conversations/+page.server.ts` and runs its `load()` function:

```ts
// +page.server.ts
export async function load() {
    const conversations = await db.query.conversations.findMany({
        orderBy: desc(conversations.createdAt),
        limit: 50
    });
    return { conversations };
}
```

That queries PostgreSQL, returns the data. SvelteKit passes it to `+page.svelte`, which renders the list. The browser gets fully-rendered HTML with all 50 conversations visible. No JavaScript needed yet -- a search engine crawler sees everything.

Then JS hydrates, the page becomes interactive.

**Who did the work:** `+page.server.ts` -- loaded data for a page.

---

## Step 2: User clicks "New Conversation", fills out a title, submits the form

The form POSTs to an API endpoint. SvelteKit finds `src/routes/api/conversations/+server.ts` and runs its `POST` handler:

```ts
// +server.ts
export async function POST({ request, locals }) {
    const { title, tags } = await request.json();

    const conversation = await db.insert(conversations).values({
        title,
        creatorId: locals.user.id
    }).returning();

    return Response.json(conversation[0], { status: 201 });
}
```

That inserts a row into PostgreSQL, returns the new conversation as JSON. The client-side code receives the response and navigates to the new conversation's page (e.g. `/conversations/a1b2c3d4`), using the database-generated ID from the response.

**Who did the work:** `+server.ts` -- handled an HTTP request, wrote to the database, returned JSON. No page rendering involved.

---

## Step 3: User lands on `/conversations/a1b2c3d4`

The route for this page is `src/routes/conversations/[id]/+page.server.ts`. The `[id]` in the directory name is a dynamic parameter -- it's not a literal directory called `[id]`, it's a pattern that matches any value in that URL segment. SvelteKit captures whatever appears there and makes it available as `params.id`. So:

- `/conversations/a1b2c3d4` → `params.id` is `"a1b2c3d4"`
- `/conversations/f9e8d7c6` → `params.id` is `"f9e8d7c6"`

Both hit the same files. The `load()` function uses `params.id` to query the right conversation:

```ts
// +page.server.ts
export async function load({ params }) {
    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, params.id)
    });
    const messages = await db.query.messages.findMany({
        where: eq(messages.conversationId, params.id),
        orderBy: asc(messages.createdAt)
    });
    return { conversation, messages };
}
```

The page renders with the conversation title and full message history (empty for a new conversation). The browser hydrates, and the Svelte component opens a WebSocket connection to `/ws`.

**Who did the work:** `+page.server.ts` -- loaded data for a page.

---

## Step 4: User types a message and hits send

The Svelte component sends a JSON message over the WebSocket:

```ts
socket.send(JSON.stringify({ type: 'chat', content: 'Hello everyone' }));
```

This goes through the Vite proxy (dev) or nginx (production) to port 8080, where `server/server.ts` receives it. The WebSocket server:

1. Parses the JSON
2. Writes the message to PostgreSQL
3. Broadcasts it to every connected client in the conversation

```ts
socket.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === 'chat') {
        // persist
        db.insert(messages).values({ ... });
        // broadcast to everyone in real-time
        broadcastToAll({
            type: 'chat',
            sender: socket.username,
            content: parsed.content,
            timestamp: new Date().toISOString()
        });
    }
});
```

Every other user with the conversation open sees the message appear instantly -- no page reload, no polling, no HTTP request. Pure WebSocket push.

**Who did the work:** `server/server.ts` -- the standalone WebSocket process. SvelteKit was not involved in this step.

---

## Summary

```
User visits /conversations
    → +page.server.ts loads conversation list from DB
    → +page.svelte renders the list

User creates a conversation
    → +server.ts handles the POST, inserts into DB, returns the new ID

User visits /conversations/a1b2c3d4
    → +page.server.ts loads messages from DB (using [id] param from URL)
    → +page.svelte renders them, opens WebSocket

User sends a message
    → WebSocket → server/server.ts → persists + broadcasts

Other user receives message
    → server/server.ts pushes via WebSocket → their Chat component updates
```

`+page.server.ts` handles the **read path** -- loading data for pages. `+server.ts` handles **write operations** via HTTP -- creating, updating, deleting things. `server/server.ts` handles **real-time** -- pushing data to clients the instant something happens, without them asking for it.
