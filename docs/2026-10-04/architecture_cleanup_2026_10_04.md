# Architecture Cleanup & Update - October 4, 2026

## 1. Authentication
**Current:** GitHub OAuth is the sole authentication mechanism. Auth.js handles the session, providing an OAuth `account.access_token` to `getOctokit()` for authenticated operations on behalf of the user.
**Removed:** All support for Personal Access Tokens (PATs) and fine-grained PATs has been removed. The `GITHUB_SERVICE_TOKEN` used for public reading via `getAnonymousOctokit()` has also been removed. Public reading now uses an unauthenticated `Octokit` instance.

## 2. RootCog Storage
**Current:** The storage model for RootCogs consists of:
```text
<RootCogId>/
├── rootCog.md
└── rootCogInfo.json
```
**Removed:** `children.json` has been completely removed from the implementation. The ChildCog architecture is deferred to a future phase, and no replacement has been implemented during this cleanup.

## 3. Repositories
**Current:** The system uses a fixed private repository (`YVSApps_Cogmit_Data`) for the user's data.

## 4. cogsIndex.json
**Current:** `cogsIndex.json` remains a major part of the current storage model, indexing RootCogs and tracking their project assignment and basic metadata.

## 5. Application Surface (Routes)
**Current:** 
- **Author-facing routes** (`/myCogs/...`, create/edit/view flows) remain fully functional.
- **Reader-facing routes** (`/cogmits/...`) remain functional. They continue to read from `cogsIndex.json` in the fixed private repository for now.

## 6. Publishing Architecture
**Current:** The old publishing mechanism is being replaced. The current implementation (where `isPublic`, `cogmitPublished`, `cogmitId`, and `slug` are written to `cogsIndex.json` and read by reader routes) is retained *only* to keep the reader-facing routes functional until the new architecture is implemented.

**Future Architecture (Deferred):**
The future publishing implementation is planned and deferred. It involves two potential models:
1. **PUBLIC-ONLY:**
   ```text
   PUBLIC-ONLY repository
   ├── RootCogs
   ├── rootCog.md
   ├── rootCogInfo.json
   └── cogsIndex.json
   ```
2. **PRIVATE + PUBLIC:**
   ```text
   PRIVATE REPOSITORY
   ├── private Cogmit state
   ├── RootCogs
   └── cogsIndex.json
   
   PUBLIC REPOSITORY
   ├── published RootCogs
   └── cogmitsIndex.json
   ```
In the future architecture, the public repository will contain `cogmitsIndex.json`. Implementation details such as exact copy semantics, synchronization, republishing, and public ID generation are deferred.
