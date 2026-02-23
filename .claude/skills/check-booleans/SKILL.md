---
name: check-booleans
description: Scan the codebase for boolean flag creep and suggest refactoring patterns. Use when reviewing state management or before/after adding new boolean flags.
---

# Boolean Flag Creep Review

Scan `.svelte` and `.svelte.ts` files for patterns that indicate boolean flag creep.

## What to Look For

1. **Multiple `$state` booleans declared together**
   - `isLoading`, `hasError`, `isDone`, `isOpen`, `isInitialized`, etc.
   - Especially when they represent related states

2. **Complex `$effect` blocks managing state transitions**
   - Guards like `if (!initialized) { ... initialized = true }`
   - Multiple flags being set in response to the same trigger

3. **Scattered conditionals checking the same flags**
   - Same boolean checked in multiple places
   - Combined checks like `if (isLoading && !hasError)`

4. **Flags that represent a state machine**
   - `isEditing` + `isSaving` (should be `mode: 'view' | 'editing' | 'saving'`)
   - `isOpen` + `isClosing` + `isClosed`

## Skip These (Valid Patterns)

- Single boolean toggles (`isOpen` for a panel)
- Independent flags with dedicated action methods
- Image/resource error tracking (`imageError` with derived fallback)
- Files we've already refactored (note in report)

## Output Format

For each finding, report:

```
### `path/to/file.svelte` — SEVERITY

**Flags:** list the boolean variables involved

**Issue:** brief description of the problem

**Suggestion:** which pattern to apply
- Derive instead of track
- Discriminated union
- Encapsulate in store
```

Severity levels:

- **MINOR** — Valid pattern or low impact, no action needed
- **MODERATE** — Worth refactoring, clear improvement available
- **SEVERE** — Multiple flags forming implicit state machine, refactor soon

End with a summary count and prioritized list of quick wins.
