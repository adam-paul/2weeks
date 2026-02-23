---
name: check-ui
description: Audit UI component architecture for missing abstractions, raw CSS values, duplicated patterns, and organizational violations. Use when reviewing components, after adding new UI, or before/after refactors.
---

# UI Component Architecture Review

Scan all `.svelte` files and `tokens.css` for violations of the UI component system.

## Component Organization Rules

Components are organized into four layers. The layer determines where a component lives.

| Layer                   | Location                | Rule                                                                                                                       |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **UI primitives**       | `components/ui/`        | Domain-agnostic. Does NOT import from `$lib/types` or any store. Could exist in a different app unchanged.                 |
| **Feature components**  | `components/<feature>/` | Domain-specific. Every top-level feature gets its own directory, regardless of component count.                             |
| **Shared components**   | `components/` root      | Used by 2+ features. If a feature component gains a second consumer, move it up to root.                                   |
| **Layout (app chrome)** | `components/layout/`    | The persistent shell rendered on every page (navigation, sidebar, header). Allowed domain knowledge because those are app-level concerns. |

**Litmus tests:**

- Could this component exist in a different app? Yes → `ui/`. No → feature dir or shared root.
- Does it render on every page as part of the persistent shell? Yes → `layout/`.
- Is it used by only one feature? Yes → `components/<feature>/`.
- Is it used by 2+ features? Yes → `components/` root.

### What to Check

1. **Feature components in wrong location** — A component used only by one feature should be in `components/<feature>/`, not `components/` root.
2. **UI primitives with domain imports** — A component in `ui/` that imports from `$lib/types` or a store should be moved to a feature directory or the root.
3. **Shared components in feature directories** — A component in a feature directory that is imported by a non-feature file should move to `components/` root.
4. **Non-persistent components in layout/** — A component in `layout/` that is used by individual pages (not the root layout) should move to `ui/` or a feature directory.

## Missing Abstractions

Look for UI patterns that repeat across components without a shared primitive. These are the high-value signals:

### 1. Repeated button-like elements without a shared Button component

Search for `<button>` elements that are styled from scratch instead of using a `ui/` component. Especially look for:

- Icon-only buttons (just an icon child, no text) — should use a shared icon button
- Buttons with custom classes that duplicate a shared button's job

### 2. Repeated empty state markup

Search for `.empty-state`, `.empty-message`, `.no-results`, or similar classes. These should use a shared placeholder component. Compare padding, font-size, and layout — inconsistencies indicate a missing shared component.

### 3. Input/textarea elements styled outside of shared components

Search for `<input` and `<textarea` elements in files outside `components/ui/`. If they define their own border, background, font-size, focus styles, they should use a shared component.

### 4. Modal/dialog patterns

Search for `modal-backdrop`, `position: fixed`, `inset: 0`, or similar overlay patterns. These should use a shared modal component for the shell (backdrop + chrome). Feature-specific content goes in a feature component that composes the modal.

### 5. Toggle/switch patterns

Search for `role="switch"` or toggle-like button+thumb markup. Should use a shared component.

## Design Tokens (`tokens.css`)

All visual constants (colors, spacing, typography, radii, transitions) should be defined as CSS custom properties in a `tokens.css` file and used throughout components via `var()`. This ensures visual consistency and makes theming/refactoring straightforward.

### Must use tokens (flag these)

- **Colors**: Any `#hex`, `rgb()`, `hsl()` value that isn't inside a `var()` fallback
- **Spacing used as padding/margin/gap**: Raw `px`/`rem` values where a `--space-*` token exists (e.g., `4px` → `--space-1`, `8px` → `--space-2`, `12px` → `--space-3`, `16px` → `--space-4`)
- **Font sizes**: Raw `px`/`rem` where a `--font-size-*` token exists
- **Border radius**: Raw values where a `--radius-*` token should be used
- **Transitions**: Raw durations where `--transition-fast`, `--transition-base`, `--transition-slow` exist

### Acceptable raw values (skip these)

- **`var()` fallbacks**: `var(--color-primary, #3b82f6)` is correct CSS
- **Layout constraints**: `grid-template-columns: minmax(280px, 1fr)`, `max-width: 400px` on modals, panel widths — these are structural, not design tokens
- **Tiny offsets**: `translateY(-1px)`, `translateX(20px)` for micro-interactions
- **Border widths**: `2px`, `3px` when used with `solid var(--color-border)` — these are structural
- **Component-internal sizing**: Fixed dimensions inside a UI primitive (e.g., toggle thumb size inside `Toggle.svelte`) are fine — they're encapsulated

### Should be tokens eventually (note but don't flag as violations)

- **Repeated magic numbers**: If the same `px` value appears in 3+ components, note it as a candidate for a new token
- **Panel/sidebar widths**: Candidates for `--panel-width-*` tokens if they repeat

## Duplicated Styling Patterns

Look for near-identical CSS blocks across components. Focus on:

- Same flex centering + color + transition pattern (icon buttons)
- Same border + background + focus pattern (inputs)
- Same padding + text-align + muted color pattern (empty states)

For each duplicate, note which shared component should own it.

## Output Format

For each finding, report:

### `path/to/file.svelte` — SEVERITY

**Type:** MISPLACED | MISSING_ABSTRACTION | RAW_VALUE | DUPLICATION

**Issue:** brief description

**Fix:** what to do (create component, move file, use token, use existing component)

Severity levels:

- **LOW** — Single instance, no duplication yet, but worth noting
- **MODERATE** — Pattern appears 2-3 times, should consolidate
- **HIGH** — Pattern appears 4+ times or creates meaningful inconsistency

End with:

1. Summary counts by severity
2. Proposed new components (if any) with suggested Props interface
3. Proposed new tokens (if any)
4. File moves needed
