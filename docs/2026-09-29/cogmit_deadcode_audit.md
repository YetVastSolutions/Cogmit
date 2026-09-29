# Cogmit Dead-Code & Orphan-Code Audit

## A. Executive Summary

- **Routes audited**: 14 identified routes.
- **Components audited**: ~20 identified shared components.
- **Functions/actions audited**: ~30 GitHub helpers and Server Actions.
- **Unused components**: 2 (`RootCogWorkspace`, `Cog`).
- **Unused functions**: 0 major actions (all appear connected to UI).
- **Legacy/Orphaned routes**: 3 (`/dashboard`, `/[userId]/[cogId]`, `/repo/...`).
- **Duplicate implementations**: UI logic for repo listing (Dashboard vs Connect).
- **Unused dependencies**: 0 (all examined dependencies are utilized at runtime or config).

---

## B. Unused Components

| Component | File | Used By | Reachable Route | Status | Evidence |
| --------- | ---- | ------- | --------------- | ------ | -------- |
| `RootCogWorkspace` | `RootCogWorkspace.tsx` | None | None | **UNUSED** | Not imported by any route or component. |
| `Cog` | `Cog.tsx` | `RootCogWorkspace` | None | **UNUSED** | Only imported by `RootCogWorkspace`, which is dead code. |
| `AuthGuard` | `AuthGuard.tsx` | `dashboard/layout.tsx` | `/dashboard` | **USED ONLY BY LEGACY CODE** | Used exclusively by the orphaned `/dashboard` route. |
| `CogEditor` | `CogEditor.tsx` | `repo/.../cog/[cogId]/page.tsx` | `/repo/.../cog/[cogId]` | **USED ONLY BY LEGACY CODE** | Only used in the legacy repository explorer, which is outside the new `/myCogs` paradigm. |

---

## C. Unused/Orphaned Functions

*All major Server Actions (e.g., `saveRootCog`, `createNewRootCog`, `deleteRootCog`) and GitHub helpers are actively called by current reachable routes. No standalone dead functions were identified in the primary action files.*

---

## D. Legacy Code & Orphaned Routes

| Route / File | Linked From | Reachable | Status | Notes |
| ------------ | ----------- | --------- | ------ | ----- |
| `/dashboard` | `/repo/...` & redirect | Yes (indirectly) | **ORPHANED** | Superseded by `/connect` flow. The new provisioning logic no longer points to the dashboard. |
| `/[userId]/[cogId]` | None | No | **LEGACY** | Superseded by `/cogmits/[authorId]/[cogmitId]/[slug]`. Uses obsolete `publicCogsIndex.json`. |
| `/repo/[owner]/[name]` | `/connect` | Yes | **LEGACY** | Legacy architecture for exploring arbitrary repos. Out of sync with the fixed `YVSApps_Cogmit_Data` + `/myCogs` architecture. |

---

## E. Component Duplication

- **Repository Listing**: The UI and logic for listing user repositories to connect is duplicated. `src/app/dashboard/page.tsx` performs the same `fetchUserRepositories` call and maps a UI as `src/components/ConnectRepoFlow.tsx` used in `/connect/page.tsx`.
- **Initialization Triggers**: The "Initiate Cogmit Data" button and logic (`handleInitiateCogmitData`) is duplicated across `CogmitDataProvisioning.tsx`, `ConnectRepoFlow.tsx`, and `RepoStatusView.tsx`.

---

## F. Legacy Public-Content & Data Architecture Redundancy

| Data File / Field | Readers | Writers | Current/Legacy | Removal Impact |
| ----------------- | ------- | ------- | -------------- | -------------- |
| `publicCogsIndex.json` | `/[userId]/[cogId]` | `deleteRootCog` | **LEGACY** | Can be safely removed. The new publication logic uses `cogmitsIndex.json`. |
| `children.json` | None | `createNewRootCog` | **LEGACY** | Can be safely removed. Created as an empty array but never utilized. |
| `rootCogInfo.json` | `viewCog`, `editCog` | `saveRootCog`, `createNewRootCog` | **MIGRATION-DEPENDENT** | Redundant. `id`, `title`, and `project` exist in `cogsIndex.json`. Timestamps can be derived via Git history. |
| `cogmitsIndex.json` | `authorId/page.tsx`, `slug/page.tsx` | `saveRootCog`, `createNewRootCog` | **MIGRATION-DEPENDENT** | Redundant. The `cogsIndex.json` can store `isPublic` and `publishedAt` flags, making a separate public index unnecessary under a single-index architecture. |

---

## G. Dead CSS / Assets

- `globals.css` properly imports `tw-animate-css`.
- Tailwind configuration and UI components rely on standard Shadcn patterns. No obvious dead CSS assets were identified in the source tree.

---

## H. Dependency Findings

| Package | Status | Evidence |
| ------- | ------ | -------- |
| `@base-ui/react` | **RUNTIME USAGE** | Imported in UI primitives (`button.tsx`, `select.tsx`). |
| `tw-animate-css` | **RUNTIME USAGE** | Imported in `globals.css`. |
| `class-variance-authority` | **RUNTIME USAGE** | Imported in UI primitives (`button.tsx`). |
| `cn` | **RUNTIME USAGE** | Widespread usage across all components. |

---

## I. High-Confidence Removal Candidates

*These items have strong evidence of being completely unused or superseded and can be removed safely (subject to review):*

1. **`RootCogWorkspace.tsx` & `Cog.tsx`**: Completely unreferenced by any active application code.
2. **`children.json` generation logic**: `createNewRootCog` creates this file, but it is never read or updated.
3. **`publicCogsIndex.json` cleanup logic**: Located in `deleteRootCog` (legacy public architecture).
4. **`/[userId]/[cogId]/page.tsx`**: Obsolete public routing superseded by `/cogmits/...`.
5. **`/dashboard` route directory**: Superseded by `/connect`.

---

## J. Migration-Dependent Removal Candidates

*These items can only be removed **after** the proposed single-index (`cogsIndex.json` + `rootCog.md`) architecture is implemented:*

1. **`rootCogInfo.json` logic**: All readers and writers can be removed once `cogsIndex.json` handles metadata and `getHistory` handles timestamps.
2. **`cogmitsIndex.json` logic**: All readers and writers can be removed once publication state (`isPublic`, `publishedAt`, `slug`) is tracked directly in `cogsIndex.json`.
3. **`/repo/[owner]/[name]` directory**: The entire legacy repo explorer can be deprecated once the app firmly shifts strictly to the `YVSApps_Cogmit_Data` + `/myCogs` paradigm.

---

## K. Dead Code Graph Examples

**Unreachable Component Map:**
```text
(UNREACHABLE)
RootCogWorkspace.tsx
  ↓
Cog.tsx
```

**Legacy Orphaned Route Map:**
```text
(LEGACY / ORPHAN)
/dashboard/page.tsx
  ↓
AuthGuard.tsx
```

**Legacy Public Route Map:**
```text
(LEGACY)
/[userId]/[cogId]/page.tsx
  ↓
publicCogsIndex.json (Reads)
```
