---
name: scaffold-react-feature
description: Scaffold a new React feature for the PI Planning tool. Creates feature directory, main component, hooks, and API integration. Invoke when adding a new UI section (e.g., "add import page", "create PI setup screen").
---

# Scaffold React Feature

You are scaffolding a new feature for the PI Planning React app.

## What to Create

Given a feature name `<feature>` (e.g., `pi-setup`, `import`, `backlog`), create:

### 1. Feature Directory
`apps/web/src/features/<feature>/`

### 2. Main Component
`apps/web/src/features/<feature>/<Feature>.tsx`
- Named export (not default)
- TypeScript strict mode
- Tailwind CSS for styling

### 3. Feature Hook
`apps/web/src/features/<feature>/use-<feature>.ts`
- Encapsulates TanStack Query calls and local state
- Returns typed data + loading/error states
- Uses `@pi-planning/shared-types` for all API types

### 4. Sub-components (as needed)
`apps/web/src/features/<feature>/components/<SubComponent>.tsx`

### 5. API Integration
- Use `lib/api-client.ts` for HTTP calls
- Import all request/response types from `@pi-planning/shared-types`
- Never define API types locally in the web app

## Rules

- All components are named exports
- Props interfaces defined inline (not in separate files unless reused)
- Use TanStack Query for any server state (`useQuery`, `useMutation`)
- Use Zustand only for pure UI state (no server data in Zustand)
- Tailwind classes only — no inline styles, no CSS modules
- Feature colors for stories: use `lib/colors.ts` deterministic hash (not hardcoded)
- Scheduling warnings displayed inline on story cards — never blocking dialogs

## dnd-kit (for board features)

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
```

- Always use `DragOverlay` for the drag preview
- Validate scheduling rules before committing the drop to the API
- Show warnings from `use-scheduling-warnings.ts` hook
