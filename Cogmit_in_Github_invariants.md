# Cogmit in GitHub

**Status:** LOCKED DESIGN RECORD --- current discussion\
**Scope:** Candidate GitHub-first Cogmit architecture for the current
personal/hobby implementation.\
**Important:** This document records the agreed GitHub model discussed
in this thread. It does not silently replace the existing locked Phase-1
Cogmit architecture documents until that architecture is explicitly
superseded.

------------------------------------------------------------------------

## 1. Core Direction

Cogmit is being explored as a GitHub-backed content and persistence
system.

The primary GitHub repository is the product boundary for Cogmit.

For the current implementation direction:

``` text
GitHub repository
└── Cogmit product data
```

GitHub provides:

-   persistent storage
-   Git history
-   diffs
-   timestamps/history
-   user-controlled version history
-   filesystem-based organization

The application uses the GitHub API through its backend/serverless layer
rather than treating GitHub as a browser-side credential store.

This model is intentionally kept simple for the current personal/hobby
use case.

------------------------------------------------------------------------

# 2. Storage Hierarchy

The agreed conceptual hierarchy is:

``` text
User
└── GitHub account / repository
    └── Project
        └── RootCog
            └── ChildCogs
```

Projects may be nested arbitrarily:

``` text
Project
└── SubProject
    └── SubProject
        └── RootCog
```

A Project is represented by a directory.

Moving a Project is therefore fundamentally a directory/path operation.

A RootCog can exist:

1.  inside a Project hierarchy, or
2.  without a parent Project.

RootCogs without a parent Project are called **NPPCogs**.

------------------------------------------------------------------------

# 3. NPPCogs

The agreed name for RootCogs without a parent Project is:

**NPPCogs**

The exact top-level folder name is:

``` text
NPPCogs/
```

Therefore:

``` text
cogmit/
├── projects/
└── NPPCogs/
```

`NPPCogs` is the storage location for RootCogs that do not belong to a
Project.

------------------------------------------------------------------------

# 4. Project Folder Structure

There is deliberately **no `cogs/` subfolder inside a Project**.

The Project directory directly contains:

-   `projectData.json`
-   RootCog directories
-   nested Project directories

Example:

``` text
projects/
└── Current Affairs/
    ├── projectData.json
    │
    ├── Geopolitics/
    │   ├── projectData.json
    │   ├── rootCog-A/
    │   │   ├── rootCog.md
    │   │   ├── rootCogInfo.json
    │   │   └── children.json
    │   │
    │   └── rootCog-B/
    │       ├── rootCog.md
    │       ├── rootCogInfo.json
    │       └── children.json
    │
    └── Elections/
        ├── projectData.json
        └── rootCog-C/
            ├── rootCog.md
            ├── rootCogInfo.json
            └── children.json
```

A Project directory therefore acts as a general container for its own
RootCogs and child Projects.

------------------------------------------------------------------------

# 5. Project Naming

The Project folder name is the **Project name**, not a Project ID.

Project title/name maximum:

**57 characters**

The filesystem path represents the Project's structural
identity/location.

A separate Project ID should not be introduced unless a concrete later
requirement requires one.

Nested Projects may have the same name as Projects elsewhere in the
hierarchy because their full paths distinguish them.

------------------------------------------------------------------------

# 6. Project Data

Each Project may contain:

``` text
projectData.json
```

This file contains metadata that belongs specifically to that Project.

The Project directory name itself is the authoritative Project name.

Therefore `projectData.json` should not unnecessarily duplicate the
Project name merely because it is already encoded by the directory.

General principle:

> Filesystem represents structural identity and hierarchy. JSON stores
> metadata that the filesystem cannot provide.

------------------------------------------------------------------------

# 7. RootCog Storage Unit

Each RootCog is a directory.

Example:

``` text
rootCog-A/
├── rootCog.md
├── rootCogInfo.json
└── children.json
```

The RootCog directory is the RootCog storage boundary.

The agreed filenames are:

### `rootCog.md`

Contains the actual RootCog content.

This is the canonical human-readable content format.

Markdown remains suitable for later transformation into plain text for
runtime CIS/TTS processing.

### `rootCogInfo.json`

Contains RootCog-specific metadata that should not be redundantly
recreated in the Markdown content.

### `children.json`

Contains the RootCog's ChildCogs as a single ChildCog collection.

For the current design, ChildCog storage is intentionally not being
elaborately designed further.

The current preference is:

> Keep ChildCogs together in one `children.json` file rather than
> creating a separate content file for every ChildCog.

The reason is that ChildCogs are expected, in many cases, to be
relatively small comments/notes.

ChildCog storage can be revisited later if actual usage demonstrates a
need for another structure.

------------------------------------------------------------------------

# 8. RootCog Content Filename

The canonical RootCog content filename is:

``` text
rootCog.md
```

**Not:**

``` text
content.md
```

This naming is locked for the current GitHub model.

------------------------------------------------------------------------

# 9. Global Cog Index

There will be **one global index file** at the repository root:

``` text
cogsIndex.json
```

There will not be a separate Cog index inside every Project by default.

Repository structure:

``` text
cogmit/
├── cogsIndex.json
├── projects/
└── NPPCogs/
```

The purpose of `cogsIndex.json` is global RootCog discovery and
navigation.

It is **not** a second authoritative database.

------------------------------------------------------------------------

# 10. Why There Is Only One Cog Index

The filesystem already represents Project hierarchy.

Therefore a separate index inside every Project would duplicate
structural information.

The global `cogsIndex.json` can provide the information required for:

-   listing a user's RootCogs
-   grouping RootCogs by Project
-   listing NPPCogs
-   central RootCog search
-   opening a RootCog directly
-   identifying deleted RootCogs

The application can reconstruct Project hierarchy from the paths already
represented in the index and filesystem.

Principle:

> Filesystem represents hierarchy. `cogsIndex.json` represents RootCog
> discovery/navigation.

------------------------------------------------------------------------

# 11. Navigation Index Design

`cogsIndex.json` is a **navigation index**, not a pure minimal pointer
index.

Each active RootCog record contains:

-   RootCog ID
-   RootCog title
-   immediate parent Project name
-   RootCog path

Example:

``` json
{
  "cogs": [
    {
      "id": "rootCog-A",
      "title": "Why Social Media Platforms Fail Long-Form Commentary",
      "project": "Geopolitics",
      "path": "projects/Current Affairs/Geopolitics/rootCog-A"
    },
    {
      "id": "rootCog-B",
      "title": "Thoughts on International Political Developments",
      "project": "Geopolitics",
      "path": "projects/Current Affairs/Geopolitics/rootCog-B"
    },
    {
      "id": "rootCog-C",
      "title": "Uncategorized Idea",
      "project": null,
      "path": "NPPCogs/rootCog-C"
    }
  ]
}
```

------------------------------------------------------------------------

# 12. RootCog Title Length

RootCog title maximum:

**77 characters**

This applies to the title stored in the navigation index and to the
RootCog's defined title.

The index therefore stores a short, bounded title suitable for
navigation/search.

------------------------------------------------------------------------

# 13. Why the Index Stores the Project Name

The immediate parent Project name is intentionally stored in each active
RootCog record.

This is a small amount of deliberate denormalization.

It makes common operations straightforward:

``` text
List all Cogs in Geopolitics
List all Cogs in Movies
List all NPPCogs
Search Cogs by title
Group Cogs by immediate Project
```

The Project name is not intended to replace the path.

The path remains the actual storage location.

Therefore:

``` json
{
  "project": "Geopolitics",
  "path": "projects/Current Affairs/Geopolitics/rootCog-A"
}
```

is intentional.

`project` means the **immediate parent Project**.

The complete hierarchy remains encoded by `path`.

------------------------------------------------------------------------

# 14. No Separate Project Hierarchy in `cogsIndex.json`

The index does not maintain a separate:

``` json
{
  "projects": {
    ...
  }
}
```

tree.

That would duplicate the filesystem hierarchy.

For example, if the index contains:

``` text
projects/Current Affairs/rootCog-A
projects/Current Affairs/Elections/rootCog-B
projects/Current Affairs/Elections/US/rootCog-C
projects/Current Affairs/Geopolitics/rootCog-D
```

the application has enough information to reconstruct:

``` text
Current Affairs
├── rootCog-A
│
├── Elections
│   ├── rootCog-B
│   └── US
│       └── rootCog-C
│
└── Geopolitics
    └── rootCog-D
```

This can be generated functionally when the hierarchy is opened.

Subprojects therefore do not need separate index records solely to
describe their existence.

------------------------------------------------------------------------

# 15. Central Search

The central search bar can search `cogsIndex.json`.

The primary searchable fields are:

-   RootCog title
-   RootCog ID
-   immediate Project name

The search can return RootCogs regardless of Project.

The `path` from the index then gives the application the location
required to open the actual RootCog.

This avoids loading every RootCog's content merely to perform global
navigation/search.

------------------------------------------------------------------------

# 16. Index Is Not Source of Truth

`cogsIndex.json` must not become a shadow database.

The authoritative RootCog remains its actual storage directory:

``` text
<RootCog directory>/
├── rootCog.md
├── rootCogInfo.json
└── children.json
```

The index provides navigation/discovery information.

If an index record becomes stale, the actual filesystem/storage
structure remains the authoritative location of the RootCog.

User-initiated structural operations must keep the index synchronized.

------------------------------------------------------------------------

# 17. Project Moves

Because the Project name is represented by the directory name and the
RootCog record contains its path, moving a Project changes the relevant
path.

Example:

``` text
projects/Current Affairs/Geopolitics/rootCog-A
```

becomes:

``` text
projects/Current Affairs/International Relations/rootCog-A
```

The corresponding index path changes.

The immediate Project value changes from:

``` text
Geopolitics
```

to:

``` text
International Relations
```

No separate Project index is required.

------------------------------------------------------------------------

# 18. Deleted Cogs

The deleted-Cog concept is explicitly named:

**deletedCogs**

It is **not** called a recycle bin or recycled bin.

The future physical storage location is:

``` text
deletedCogs/
```

A deleted RootCog retains:

-   the same RootCog ID
-   the same title
-   the same Project value
-   the same historical path information as recorded for the deletion
    state, subject to the later physical move implementation

The principal change is that the RootCog becomes a `deletedCog` object
in `cogsIndex.json`.

The deleted Cog's title does **not** change.

------------------------------------------------------------------------

# 19. Deleted Cog Index Object

A deleted RootCog will contain deletion time information.

Conceptually:

``` json
{
  "id": "rootCog-X",
  "title": "Original RootCog Title",
  "project": "Geopolitics",
  "path": "projects/Current Affairs/Geopolitics/rootCog-X",
  "deletedAt": "2026-09-26T12:00:00Z"
}
```

The object is classified as a deleted Cog.

The existing title, project and path information are retained rather
than replaced with a new identity.

The exact final JSON schema for the deleted-Cog collection remains
subject to implementation design in the later sprint.

------------------------------------------------------------------------

# 20. 57-Day Deletion Lifecycle

Deleted Cogs are subject to a **57-day deletion period**.

The deletion timestamp is stored in `cogsIndex.json`.

The intended later-sprint behavior is:

1.  A RootCog is deleted.
2.  Its deletion time is recorded.
3.  It becomes a deleted-Cog object in `cogsIndex.json`.
4.  Its content is associated with the `deletedCogs` location.
5.  On user login, a `cogDeletion` check examines deleted Cogs.
6.  The system identifies deleted Cogs whose deletion period has
    exceeded 57 days.
7.  The user is notified that those Cogs are due for permanent deletion.
8.  If the user logs out without checking the notification, the eligible
    Cogs are deleted.

This functionality is **not part of the earliest implementation
sprint**.

It is explicitly recorded as a later-sprint requirement because it
involves:

-   deletion
-   notification
-   login-time checking
-   logout-time behavior
-   permanent deletion

No background deletion worker is implied by this design.

------------------------------------------------------------------------

# 21. GitHub Architecture and Versioning

Git provides the repository's historical versioning.

GitHub history can provide:

-   commit history
-   change history
-   diffs
-   prior states
-   timestamps associated with commits

The application therefore should not duplicate Git's historical
information merely to recreate version history.

Domain metadata should only be stored where Git cannot provide the
required semantic information.

------------------------------------------------------------------------

# 22. `cogsIndex.json` Schema Version

A per-user:

``` json
"version": 1
```

field is **not required as part of the current design**.

The intended approach is that when the Cogmit architecture/schema
changes in a future application version, the application can
functionally update/migrate the user's GitHub repository structure and
index.

GitHub/Git itself provides the history required to see previous states.

Important distinction:

> Git history provides historical file versions; it does not
> automatically migrate a changed application schema.

Therefore, if the architecture changes, the application is responsible
for reading the existing structure and performing whatever migration is
required.

For the current design, a user-specific `cogsIndex.json` schema-version
field is intentionally omitted.

------------------------------------------------------------------------

# 23. Current Agreed Repository Shape

The current design is:

``` text
cogmit/
│
├── cogsIndex.json
│
├── projects/
│   └── <Project Name>/
│       ├── projectData.json
│       │
│       ├── <RootCogId>/
│       │   ├── rootCog.md
│       │   ├── rootCogInfo.json
│       │   └── children.json
│       │
│       └── <SubProject Name>/
│           ├── projectData.json
│           └── <RootCogId>/
│               ├── rootCog.md
│               ├── rootCogInfo.json
│               └── children.json
│
└── NPPCogs/
    └── <RootCogId>/
        ├── rootCog.md
        ├── rootCogInfo.json
        └── children.json
```

Future deleted-Cog storage:

``` text
deletedCogs/
└── <RootCogId>/
    ├── rootCog.md
    ├── rootCogInfo.json
    └── children.json
```

The exact integration of `deletedCogs` with the index remains a
later-sprint implementation detail, but the concept and naming are
locked.

------------------------------------------------------------------------

# 24. Deliberately Deferred

The following are intentionally **not being designed further in this
discussion**:

-   detailed ChildCog schema
-   ChildCog file sharding
-   advanced ChildCog lifecycle
-   permanent deletion implementation
-   deletion notification UI
-   `cogDeletion` implementation
-   logout deletion mechanics
-   GitHub API implementation details
-   GitHub App/authentication implementation
-   public/private publishing implementation
-   central YetVast memory architecture
-   Phase-2 features

These should not be introduced implicitly into the current storage
model.

------------------------------------------------------------------------

# 25. Design Principles Locked by This Discussion

1.  **`rootCog.md` is the RootCog content file.**
2.  **`rootCogInfo.json` is the RootCog metadata file.**
3.  **`children.json` is the current single ChildCog collection file.**
4.  **`NPPCogs/` is the folder for RootCogs without a parent Project.**
5.  **Project directories do not contain a `cogs/` subfolder.**
6.  **Project folder names are Project names, not Project IDs.**
7.  **Project title/name maximum is 57 characters.**
8.  **RootCog title maximum is 77 characters.**
9.  **`cogsIndex.json` is the sole global RootCog navigation index.**
10. **Separate per-Project Cog index files are not used by default.**
11. **`cogsIndex.json` is a navigation/discovery index, not a shadow
    database.**
12. **Each active RootCog index record contains ID, title, immediate
    Project name, and path.**
13. **The complete Project hierarchy is represented by filesystem paths,
    not duplicated in the index.**
14. **The index remains flat with respect to RootCogs; Projects do not
    need a duplicated tree representation.**
15. **Central search can operate against `cogsIndex.json`.**
16. **Deleted Cogs are called `deletedCogs`, not a recycle bin.**
17. **Deleted Cogs retain their title, Project value, and recorded path
    information.**
18. **Deletion time is stored as `deletedAt`.**
19. **The 57-day deletion lifecycle is a later-sprint feature.**
20. **Login-time `cogDeletion` checking and deletion notification are
    later-sprint functionality.**
21. **Permanent deletion is later-sprint functionality.**
22. **A per-user index schema-version field is not currently required.**
23. **Future architecture changes may migrate user repositories
    functionally; Git history preserves prior states but does not
    perform migrations automatically.**
24. **Git remains the source of historical versioning rather than
    duplicating Git history in Cog metadata.**
25. **Do not add storage layers, index layers, or metadata fields
    without a concrete requirement.**

------------------------------------------------------------------------

# 26. Current Design Objective

The GitHub Cogmit model is intentionally optimized for:

-   one primary user initially
-   low implementation complexity
-   fast content creation
-   persistent Markdown-based cognition
-   clear filesystem organization
-   cheap global navigation
-   central search
-   Git-native history
-   minimal metadata duplication
-   user-initiated persistence
-   later extensibility without premature infrastructure

The guiding rule is:

> **Use the filesystem for structure, Markdown for cognition, small JSON
> files for domain metadata, one global `cogsIndex.json` for navigation,
> and Git for history.**

------------------------------------------------------------------------

# 27. Centralized Constants and Single Source of Truth (SSOT)

### Rule 1: Central ownership
All application-wide shared constants, design tokens, configuration values, fixed limits and reusable identifiers must have one authoritative definition in the central constants module.

### Rule 2: No duplicate declarations
Developers must not independently redeclare an existing application-wide constant inside individual components, pages, hooks, utilities, services or other modules.

### Rule 3: Import instead of hardcoding
All consumers must import shared values from the central source.
Hardcoding a value that already has an established central definition is prohibited.

### Rule 4: Changes happen centrally
When an application-wide value needs modification, update its central definition rather than changing individual consumers.

### Rule 5: Semantic separation
Different values must remain separate when their underlying business meaning differs, even if their current numeric or string values happen to be identical.

### Rule 6: Local variables remain local
Temporary variables, calculations, component state, function parameters, runtime-generated values and genuinely module-specific implementation details do not need to be moved into the central constants module.

### Rule 7: No unnecessary configuration infrastructure
Do not introduce additional configuration files, runtime configuration services or redundant abstraction layers merely to centralize constants.

### Rule 8: New development compliance
Every future feature, component, utility, hook or service must first check whether an appropriate shared constant already exists.
If it exists, reuse it.
If a genuinely new application-wide constant is needed, define it centrally before consuming it.

### Rule 9: Refactoring discipline
Moving or consolidating constants must not change existing application functionality or behaviour.

### Rule 10: Enforcement
This is a permanent repository-wide coding rule, not a one-time cleanup instruction.
