---
name: scaffold-react-feature
description: Scaffold a new React feature for the PI Planning tool.
---

Scaffold a new React feature for the PI Planning tool.

The feature name is: $FEATURE_NAME

Create the following:

1. **Feature directory**: `apps/web/src/features/$FEATURE_NAME/`

2. **Main component**: `apps/web/src/features/$FEATURE_NAME/<FeatureName>.tsx`
   - Named export, TypeScript strict, Tailwind CSS

3. **Feature hook**: `apps/web/src/features/$FEATURE_NAME/use-$FEATURE_NAME.ts`
   - Encapsulates TanStack Query calls + local state
   - All API types from `@pi-planning/shared-types`

4. **Sub-components** (if needed): `apps/web/src/features/$FEATURE_NAME/components/`

Constraints:
- All components are named exports
- Use TanStack Query for server state, Zustand for UI-only state
- Tailwind classes only — no inline styles
- Import all API types from `@pi-planning/shared-types` — never redefine locally
- Feature colors via `lib/colors.ts` deterministic hash
- Scheduling warnings shown inline — never blocking dialogs
