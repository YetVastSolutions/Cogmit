# Cogmit Codebase Architecture Audit

## A. Complete route table

| Route | Access | Purpose | Main component | Client/Server | GitHub data |
| ----- | ------ | ------- | -------------- | ------------- | ----------- |
| `/` | Anonymous / Auth | Landing page & init | `Home` | Server | `cogsIndex.json` (via status) |
| `/aboutCogmit` | Anonymous | Display local sample cog | `AboutCogmitPage` | Server | Local files (not GitHub) |
| `/myCogs` | Authenticated | List user's active Cogs | `MyCogsPage` | Server | `cogsIndex.json`, commit history |
| `/myCogs/deletedCogs` | Authenticated | List deleted Cogs | `DeletedCogsPage` | Server | `cogsIndex.json`, commit history |
| `/myCogs/new/editCog` | Authenticated | Create new Cog | `NewEditCogPage` | Server -> Client | `projects` via tree listing |
| `/myCogs/[cogId]/viewCog` | Authenticated | View existing private Cog | `ViewCogPage` | Server -> Client | `rootCog.md`, `rootCogInfo.json`, commit history, `cogsIndex.json` |
| `/myCogs/[cogId]/editCog` | Authenticated | Edit existing private Cog | `EditCogPage` | Server -> Client | `rootCog.md`, `rootCogInfo.json`, commit history, `cogsIndex.json` |
| `/cogmits/[authorId]` | Authenticated* | List author's published Cogmits | `AuthorCogmitsPage` | Server | `cogmitsIndex.json` |
| `/cogmits/[authorId]/[cogmitId]/[slug]` | Authenticated* | View published Cogmit | `CogmitPage` | Server -> Client | `cogmitsIndex.json`, `rootCog.md`, `rootCogInfo.json` |
| `/dashboard` | Authenticated | List user repositories | `DashboardPage` | Server | GitHub Repo API |
| `/repo/[owner]/[name]` | Authenticated | Repo connection status | `RepoPage` | Server | GitHub Repo API |
| `/connect` | Authenticated | Connect existing repository | `ConnectPage` | Server -> Client | GitHub Repo API |
| `/[userId]/[cogId]` | Anonymous | Legacy public view | `PublicCogPage` | Server -> Client | `publicCogsIndex.json`, `rootCog.md`, `rootCogInfo.json` |

*\* Requires GitHub Token due to Octokit initialization, throwing AuthenticationRequiredError if not present, effectively making it authenticated only.*

---

## B. Detailed route-by-route sections

### 1. `/` (Home)
- **exact route:** `/`
- **exact filesystem path:** `src/app/page.tsx`
- **static/dynamic:** Static
- **Access:** Anonymous and Authenticated (NextAuth `auth()`).
- **UI elements:** Title/Header, "Log in with GitHub" button, `CogmitDataProvisioning` component.
- **Components:** `Home` (Server), `CogmitDataProvisioning` (Client imported).
- **Operations:** Log in, Initiate Cogmit Data.
- **Backend actions:** `signIn("github")`, `checkSessionStatus()`, `getCogmitDataStatus()`, `handleInitiateCogmitData()`.
- **GitHub reads/writes:** Reads repo existence to determine provisioning status.
- **Browser/server boundary:** Server checks session and repo status, passes boolean/status object to Client component.
- **Navigation:** Connects to `/dashboard` or `/myCogs` (via provisioning logic).
- **Current limitations:** None.

### 2. `/aboutCogmit`
- **exact route:** `/aboutCogmit`
- **exact filesystem path:** `src/app/aboutCogmit/page.tsx`
- **static/dynamic:** Static
- **Access:** Anonymous visitor.
- **UI elements:** `ViewCog` layout (Title, content, YappOut, Editor button hidden/disabled).
- **Components:** `AboutCogmitPage` (Server), `ViewCog` (Client).
- **Operations:** Read-only view.
- **Backend actions:** Local filesystem `fs.readFile`.
- **GitHub reads/writes:** None (reads from `public/sample-cog/cogmit-about`).
- **Browser/server boundary:** Parses local JSON/MD on server, passes strings to `ViewCog`.
- **Navigation:** None from this page directly.

### 3. `/myCogs`
- **exact route:** `/myCogs`
- **exact filesystem path:** `src/app/myCogs/page.tsx`
- **static/dynamic:** Static
- **Access:** Authenticated Cogmit user.
- **UI elements:** Header, "+ Create Cog" button, Grid of Cards, `CogMetadataRow`, empty states, missing repo states.
- **Components:** `MyCogsPage` (Server), `CogMetadataRow` (Server/UI), `Button` (Client).
- **Operations:** Navigate to create, view, or edit cog.
- **Backend actions:** `getCogmitDataStatus()`, `getOctokit()`.
- **GitHub reads/writes:**
  - READ: `cogsIndex.json` via `repos.getContent`.
  - READ: `repos.listCommits` for each cog path to derive timestamps.
- **Browser/server boundary:** Server fetches index and commits, transforms into array of objects with timestamps, and renders static HTML. No JSON sent to client.
- **Navigation:** `→ /myCogs/new/editCog`, `→ /myCogs/[cogId]/viewCog`, `→ /myCogs/[cogId]/editCog`.
- **Current limitations:** `published` state is hardcoded `false` (Implementation gap: publication state does not exist in `cogsIndex.json`).

### 4. `/myCogs/deletedCogs`
- **exact route:** `/myCogs/deletedCogs`
- **exact filesystem path:** `src/app/myCogs/deletedCogs/page.tsx`
- **static/dynamic:** Static
- **Access:** Authenticated Cogmit user.
- **UI elements:** Header, "Back to My Cogs", Grid of deleted cards, `RestoreCogButton`.
- **Components:** `DeletedCogsPage` (Server), `CogMetadataRow`, `RestoreCogButton` (Client).
- **Operations:** Restore cog.
- **Backend actions:** `restoreRootCog()`.
- **GitHub reads/writes:**
  - READ: `cogsIndex.json`
  - READ: `repos.listCommits` for deleted cog paths.
- **Browser/server boundary:** Server fetches and filters, client component handles restore click.
- **Navigation:** `→ /myCogs`.

### 5. `/myCogs/new/editCog`
- **exact route:** `/myCogs/new/editCog`
- **exact filesystem path:** `src/app/myCogs/new/editCog/page.tsx`
- **static/dynamic:** Static
- **Access:** Authenticated Cogmit user.
- **UI elements:** `CogWorkspaceShell`, inputs for title/content, Project dropdown, Action buttons (Cancel, Cog In, Cogmit).
- **Components:** `NewEditCogPage` (Server) -> `EditCogClient` (Client).
- **Operations:** Edit text, change project, Save (Cog In), Publish (Cogmit).
- **Backend actions:** `createNewRootCog()`, `createProjectAction()`.
- **GitHub reads/writes:**
  - READ: Get projects list.
  - WRITE (on save): `rootCog.md`, `rootCogInfo.json`, `children.json`, `cogsIndex.json`, `cogmitsIndex.json` (if published).
- **Browser/server boundary:** Projects array string passed to client. Forms controlled via local React state.
- **Navigation:** `→ /myCogs`, `→ /myCogs/[cogId]/viewCog`.

### 6. `/myCogs/[cogId]/editCog`
- **exact route:** `/myCogs/[cogId]/editCog`
- **exact filesystem path:** `src/app/myCogs/[cogId]/editCog/page.tsx`
- **static/dynamic:** Dynamic (`cogId`)
- **route parameters:** `cogId`
- **Access:** Authenticated Cogmit user.
- **UI elements:** `CogWorkspaceShell`, title input, markdown editor, project dropdown, Cog In, Cogmit, Delete modal.
- **Components:** `EditCogPage` (Server) -> `EditCogClient` (Client), `DeleteCogButton` (Client).
- **Operations:** Edit, change project, save, publish, delete.
- **Backend actions:** `saveRootCog()`, `createProjectAndMoveCog()`, `moveCogToDestination()`, `deleteRootCog()`.
- **GitHub reads/writes:**
  - READ: `cogsIndex.json` (via `resolveRootCogPath`), `rootCog.md`, `rootCogInfo.json`, `listCommits` (for timestamps).
  - WRITE: Updates files and indices.
- **Browser/server boundary:** Server reads base64 content, decodes to UTF-8 string, passes to `EditCogClient` state. `rootCogInfo.json` is parsed on server.
- **State/Interaction:** React state for `content`, `title`, `project`, `isPending`. Optimistic UI not used (relies on `router.refresh()`). Modal state for publishing and deleting.

### 7. `/myCogs/[cogId]/viewCog`
- **exact route:** `/myCogs/[cogId]/viewCog`
- **exact filesystem path:** `src/app/myCogs/[cogId]/viewCog/page.tsx`
- **static/dynamic:** Dynamic (`cogId`)
- **route parameters:** `cogId`
- **Access:** Authenticated Cogmit user.
- **UI elements:** `CogWorkspaceShell`, `ViewCog`, Markdown view, "Edit Cog", "Share" (copy link), "Delete" options.
- **Components:** `ViewCogPage` (Server) -> `ViewCog` (Client).
- **Operations:** View, Move project, Edit, Share link, Delete.
- **Backend actions:** `moveCogToDestination()`.
- **GitHub reads/writes:**
  - READ: `cogsIndex.json`, `rootCog.md`, `rootCogInfo.json`, `listCommits`.
- **Browser/server boundary:** Server parses JSON and MD, sends strings to `ViewCog`.

### 8. `/cogmits/[authorId]`
- **exact route:** `/cogmits/[authorId]`
- **exact filesystem path:** `src/app/cogmits/[authorId]/page.tsx`
- **static/dynamic:** Dynamic (`authorId`)
- **route parameters:** `authorId`
- **Access:** Requires Authenticated GitHub user (implementation flaw: Catches `AuthenticationRequiredError` and blocks anonymous access).
- **UI elements:** Header, grid of Cogmit cards (title, project, published date).
- **Components:** `AuthorCogmitsPage` (Server).
- **Operations:** Navigate to specific Cogmit.
- **Backend actions:** None directly.
- **GitHub reads/writes:**
  - READ: Repository metadata (`repos.get`).
  - READ: `cogmitsIndex.json`.
- **Browser/server boundary:** Server parses index, renders HTML links.
- **Navigation:** `→ /cogmits/[authorId]/[cogmitId]/[slug]`.

### 9. `/cogmits/[authorId]/[cogmitId]/[slug]`
- **exact route:** `/cogmits/[authorId]/[cogmitId]/[slug]`
- **exact filesystem path:** `src/app/cogmits/[authorId]/[cogmitId]/[slug]/page.tsx`
- **static/dynamic:** Dynamic (`authorId`, `cogmitId`, `slug`)
- **route parameters:** `authorId`, `cogmitId`, `slug`
- **Access:** Requires Authenticated GitHub user (due to octokit req).
- **UI elements:** `ViewCog` in `cogmit` mode (shows Author, Project, Share, Like).
- **Components:** `CogmitPage` (Server) -> `ViewCog` (Client).
- **Operations:** View content, Copy public link.
- **Backend actions:** None directly.
- **GitHub reads/writes:**
  - READ: `cogmitsIndex.json`, `rootCog.md`, `rootCogInfo.json` from Author's repo.
- **Browser/server boundary:** Markdown and metadata passed to `ViewCog`. Share URL generated based on `window.location`.

---

## C. Component inventory

- `CogWorkspaceShell` (Client): Layout wrapper providing header, action rows, and scrollable content area.
- `CogActionRow` (Client): Renders the primary action buttons (Edit, Cog In, Cogmit, Share, Project Select).
- `ViewCog` (Client): Main viewing component. Uses `react-markdown` and `CogWorkspaceShell`.
- `EditCogClient` (Client): Form wrapper for editing/creating Cogs. Manages local state and invokes Server Actions.
- `CogMetadataRow` (Server): UI layout helper for rendering metadata.
- `DeleteCogButton` (Client): Trigger button and confirmation modal for deletion.
- `RestoreCogButton` (Client): Button to restore from deletedCogs.
- `PublishCogmitModal` (Client): Loading/Success/Error modal when publishing.
- `ProjectDisplay` (Client): Custom select/dropdown for moving Cogs between projects.

---

## D. Backend action inventory

Located in `src/app/myCogs/actions.ts`:
- `deleteRootCog(cogId)`: Modifies `cogsIndex.json`, `publicCogsIndex.json`, moves files via Tree API.
- `restoreRootCog(cogId)`: Modifies `cogsIndex.json`, moves files via Tree API.

Located in `src/app/myCogs/[cogId]/editCog/actions.ts`:
- `saveRootCog(cogId, title, project, content, isPublic)`: Updates MD, JSON, and Indices.
- `createProjectAndMoveCog(cogId, projectName)`: Creates project folder/JSON and moves files.
- `moveCogToDestination(cogId, destProjectName, isNew)`: Tree API move operation.
- `getCogHistory(cogId)`: Fetches commit history.

Located in `src/app/myCogs/newCog/actions.ts`:
- `createNewRootCog(title, project, content, isPublic)`: Creates files, writes empty `children.json`, updates indices.
- `createProjectAction(projectName)`: Creates `projectData.json`.

Located in `src/lib/cogmit-actions.ts`:
- `handleInitiateCogmitData()`
- `handleConnectRepository()`

---

## E. GitHub data-flow map

- `cogsIndex.json`: **Master Private Record**. Read on list views (`/myCogs`). Written on creation, title updates, deletion, restore, and moving projects.
- `rootCog.md`: **Content Record**. Read on `viewCog`/`editCog`/`cogmit`. Written on save.
- `rootCogInfo.json`: **Metadata Record**. Read on `viewCog`/`editCog`. Written on save and project move.
- `cogmitsIndex.json`: **Master Public Record**. Read on `/cogmits/*`. Appended to when `saveRootCog`/`createNewRootCog` is called with `isPublic = true`.
- `children.json`: **Unused**. Created by `createNewRootCog` but never updated or read.

---

## F. Access-control matrix

| Route | Anonymous | Authenticated user | Author | GitHub account |
| ----- | --------: | -----------------: | -----: | -------------: |
| `/myCogs/*` | No | Yes | N/A | Yes |
| `/cogmits/[authorId]` | **No** (throws) | Yes | N/A | Yes |
| `/cogmits/[authorId]/[cogmitId]/[slug]` | **No** (throws) | Yes | Yes (UI changes) | Yes |
| `/[userId]/[cogId]` | Yes (Fallback) | Yes | N/A | Yes |

---

## G. Current inconsistencies

1. **Public Cogmits access flaw:** The `/cogmits/*` routes throw `AuthenticationRequiredError` if an anonymous user tries to view them because the code initializes `getOctokit()` which requires a session. This breaks the "public `/cogmits` requirement".
2. **Legacy public route:** `/[userId]/[cogId]` reads from `publicCogsIndex.json`, but new publication logic writes to `cogmitsIndex.json`. `deleteRootCog` cleans up `publicCogsIndex.json` but doesn't clean up `cogmitsIndex.json`.
3. **Publication State mapping:** `MyCogsPage` hardcodes `published = false` because `cogsIndex.json` does not track publication state, despite publication functionality existing.
4. **Unused Files:** `children.json` is generated for new Cogs but never utilized.
5. **Project limitations:** `createProjectAndMoveCog` checks for existing project data, but the fallback project is literally named `"No Parent Project"` instead of a proper `null` or root state.
6. **File location:** `/myCogs/new/editCog` relies on `/myCogs/newCog/actions.ts` (action is named `newCog` but the route is `new`).

## H. Missing/uncertain information

- **Rate Limits:** Since GitHub API is heavily utilized directly from server components for every page load (fetching index, commits, files), it is unclear if the app handles API rate limiting gracefully.
- **Pagination:** `listCommits` fetches up to 100 commits, but there is no pagination logic to fetch older history. `getContent` limits are not addressed if `cogsIndex.json` grows massively.
