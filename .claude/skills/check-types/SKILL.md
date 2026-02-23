---
name: check-types
description: Audit type organization to ensure types have exactly one home. Use when reviewing code structure or after adding new types.
---

# Type Organization Review

Scan the codebase for type definitions that violate the "exactly one home" principle.

## The Rules

Types are **always abstracted** to dedicated type files. No inline type definitions except `Props`. Keep `types.ts` pure — no runtime code (constants, functions).

| Location                     | What belongs there                                        |
| ---------------------------- | --------------------------------------------------------- |
| `src/lib/types.ts`           | All domain types — pure type definitions only             |
| `src/lib/constants.ts`       | Runtime metadata for types (labels, colors, descriptions) |
| `src/lib/server/db/types.ts` | Database-specific types (snake_case, PostgreSQL schema)   |
| `src/lib/utils/*.ts`         | Helper functions                                          |
| Component files              | **Only** `interface Props`                                |
| Utils/stores/routes          | No type definitions — import from `types.ts`              |

**Always use path aliases** for imports:

- Use `$lib/types`, not `../types`
- Use `$lib/constants`, not `../constants`
- Use `$lib/server/db/types`, not `../../server/db/types`
- Path aliases don't break when files move and are more explicit

**No types directory.** All domain types live in a single `src/lib/types.ts` file, not spread across `src/lib/types/*.ts`. A directory invites fragmentation — `types/websocket.ts`, `types/conversation.ts`, `types/auth.ts` — and defeats the "one home" principle.

## What to Look For

### 1. Inline Types in Stores (`.svelte.ts` files)

Search for `interface` or `type` declarations in store files:

- `export interface SomeState { ... }`
- `export type SomeMode = 'a' | 'b'`
- Discriminated unions like `type LoadState = { status: 'loading' } | ...`

**These should be in `types.ts`**, even if only used in one file.

### 2. Inline Types in Utils (`src/lib/utils/*.ts`)

Same as stores — interfaces and types should be moved to `types.ts`.

### 3. Types in Route Files (`+page.server.ts`, `+server.ts`, etc.)

API response types, request body types, or any `interface`/`type` declarations.

### 4. Barrel Re-exports (`index.ts` files)

Files that do `export * from './types'` or `export type { Foo } from './other'`.
These violate "one home" because the type now has two import paths.

### 5. Component Files with Non-Props Types

Components should only define `interface Props`. Any other types should be in `types.ts`.

### 6. Relative Imports for Types

Files using `../types` or `../../types` instead of `$lib/types`.
Path aliases are required for type imports — they're more explicit and don't break when files move.

### 7. Runtime Code in types.ts

`types.ts` should contain **only** type definitions. Check for:

- `export const` — constants belong in `constants.ts`
- `export function` — functions belong in `utils/*.ts`

### 8. Types Directory Instead of Flat File

Check for `src/lib/types/` as a directory. All domain types belong in a single `src/lib/types.ts` file. If a types directory exists, its contents should be consolidated.

## Valid Exceptions (Skip These)

1. **`interface Props`** in component files — this is the component's own API
2. **`ReturnType<typeof fn>`** derived types — these are tied to their function's implementation
3. **Generic type parameters** — e.g., `function foo<T>(x: T): T`
4. **Server-side type file** — `src/lib/server/db/types.ts` is the one allowed secondary type home, for DB schema types that don't belong in the domain layer

## How to Search

```bash
# Find interface/type declarations in stores
grep -rn "^export \(interface\|type\)" src/lib/stores/

# Find interface/type declarations in utils
grep -rn "^export \(interface\|type\)" src/lib/utils/

# Find interface/type declarations in routes
grep -rn "^interface\|^type" src/routes/

# Find barrel re-exports
grep -rn "export \* from\|export type \*" src/

# Find non-Props interfaces in components
grep -rn "^interface" src/lib/components/ | grep -v "Props"

# Find relative type imports (should use $lib/types)
grep -rn "from ['\"]\.\..*types['\"]" src/

# Find runtime code in types.ts (should be in constants.ts or utils/)
grep -n "^export const\|^export function" src/lib/types.ts

# Check for types directory (should be flat file)
ls -d src/lib/types/ 2>/dev/null
```

## Output Format

For each finding, report:

```
### `path/to/file.ts` — VIOLATION

**Type:** `InterfaceName` or `TypeName`

**Issue:** Brief description (e.g., "Discriminated union defined in store file")

**Action:** Move to `types.ts` and update import
```

Violation types:

- **VIOLATION** — Type defined outside `types.ts`, must be moved
- **BARREL** — Re-export creating multiple import paths, delete barrel
- **RELATIVE** — Using `../types` instead of `$lib/types`, update import path
- **RUNTIME** — Constant or function in `types.ts`, move to `constants.ts` or `utils/`
- **DIRECTORY** — Types split across directory instead of single file, consolidate
- **VALID** — Exception case (Props, ReturnType), no action needed

## Summary

End with:

1. Count of violations by category
2. List of files that need updating
3. Any barrel files to delete

## After Fixing

Run `bun run build` to verify all imports resolve correctly after moving types.
