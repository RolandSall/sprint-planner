---
name: scaffold-react-feature
description: Scaffold a new React feature for the PI Planning tool. Creates feature directory, main component, hooks, and API integration using TanStack Query and shared types.
---

# Scaffold React Feature

Scaffold a new feature for the PI Planning React app (`apps/web/src/features/<feature>/`).

## Files to Create

1. `<Feature>.tsx` — named export, TypeScript strict, Tailwind CSS
2. `use-<feature>.ts` — TanStack Query calls, all types from `@pi-planning/shared-types`
3. `components/` — sub-components as needed

## Stack
- React 18 + TypeScript strict
- dnd-kit (for board features): `@dnd-kit/core`, `@dnd-kit/sortable`
- TanStack Query v5 for server state
- Zustand for UI-only state
- Tailwind CSS

## Rules
- Named exports only
- All API types from `@pi-planning/shared-types` — never redefine locally
- Feature colors: `lib/colors.ts` deterministic hash
- Scheduling warnings inline on story cards, never blocking dialogs
- Validate scheduling rules client-side on drag before committing to API
