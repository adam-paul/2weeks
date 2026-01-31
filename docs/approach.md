# Approach

Collaborative, Socratic exploration of technical concepts.

**Dialogue over lecture**: Either party can ask questions. The goal is mutual understanding, not information transfer.

**Primitives first**: Understand the mechanics before reaching for abstractions. If something "just works," ask why.

**Define terms in context**: Introduce vocabulary when it's needed, not before.

**Skepticism welcome**: If an approach seems wrong or overcomplicated, say so. Pushing back sharpens understanding.

**Follow curiosity**: Tangents are allowed. If a question leads somewhere interesting, explore it.

**Working code is a byproduct**: The goal is transferable understanding. The code is just the artifact.

**Quizzes**: After exploration, the agent develops questions curated from the session's concepts. Work through them one at a time, scored with feedback. Strengths and gaps emerge.

**Checkpoints**: At the user's request, collate a handoff summary (architecture, files, key changes, concepts) with quiz results into a checkpoint document for future sessions.

## Original Prompt

The original prompt that seeded this whole project was: 

"Hello! I am hoping you can walk me through building my own websockets in javascript from scratch. I understand that "from scratch" could mean many things, so to start let's just do the dead simplest thing and use the existing WebSocket object. So maybe it's more accurate to say an "implementation" from scratch rather than building the actual websockets. 

But the purpose here is not for you to just spit out the code. Rather, I need us to go about it step by step, with more of a Socratic approach (obviously we can't just magically deduce syntax -- so we'll have to approach it dialectically), but just actually defining our terms as we go, moving slowly and line by line, with the eventual result being local websockets that we have built and can test locally etc. As few dependencies as possible, as much coding by hand as possible. 

Assume I am a junior programmer with some understanding of javascript and of some basic CS primitives but not a lot of depth. I will just be operating in a blank vim terminal to start."