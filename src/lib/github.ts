import { Octokit } from "@octokit/rest";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

/** Type guard for errors with a numeric `status` property (e.g., Octokit errors). */
function isHttpError(error: unknown): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

export class AuthenticationRequiredError extends Error {
  code = "AUTHENTICATION_REQUIRED";

  constructor(message = "GitHub authentication is required") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export function isAuthenticationRequiredError(error: unknown): error is AuthenticationRequiredError {
  return error instanceof AuthenticationRequiredError;
}

export class ServiceTokenMissingError extends Error {
  code = "SERVICE_TOKEN_MISSING";

  constructor(message = "Server is missing GITHUB_SERVICE_TOKEN") {
    super(message);
    this.name = "ServiceTokenMissingError";
  }
}

export function isGitHubAuthError(error: unknown): boolean {
  if (isHttpError(error) && error.status === 401) {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("bad credentials") ||
      msg.includes("token invalid") ||
      msg.includes("token expired") ||
      msg.includes("token revoked") ||
      msg.includes("authentication required") ||
      msg.includes("unauthorized")
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Constants — canonical names
// ---------------------------------------------------------------------------

/** The fixed Cogmit data repository name inside the user's account. */
export const COGMIT_REPO_NAME = "YVSApps_Cogmit_Data";

// ---------------------------------------------------------------------------
// Authenticated User Info
// ---------------------------------------------------------------------------

/**
 * Retrieves the currently authenticated GitHub user.
 */
export async function getAuthenticatedUser() {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

// ---------------------------------------------------------------------------
// Authenticated Octokit
// ---------------------------------------------------------------------------

/**
 * Creates an authenticated Octokit instance using the current user's session.
 */
export async function getOctokit() {
  const cookieStore = await cookies();
  const secureCookie = cookieStore.get("__Secure-authjs.session-token")?.value;
  const standardCookie = cookieStore.get("authjs.session-token")?.value;
  const token = secureCookie || standardCookie;

  if (!token) {
    throw new AuthenticationRequiredError("Unauthorized: No session token found.");
  }

  const salt = secureCookie ? "__Secure-authjs.session-token" : "authjs.session-token";
  
  const decoded = await decode({
    token,
    salt,
    secret: process.env.AUTH_SECRET as string,
  });

  if (!decoded || !decoded.accessToken) {
    throw new AuthenticationRequiredError("Unauthorized: GitHub access token not found in session.");
  }

  const octokit = new Octokit({
    auth: decoded.accessToken as string,
    log: {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: (msg: unknown, ...args: unknown[]) => {
        if (typeof msg === "string" && msg.includes(" - 404 with id ")) {
          // Suppress 404 logging as they are expected (e.g. checking if org/repo exists)
          return;
        }
        console.error(msg, ...args);
      },
    },
  });

  octokit.hook.error("request", async (error) => {
    if (isGitHubAuthError(error)) {
      throw new AuthenticationRequiredError();
    }
    throw error;
  });

  return octokit;
}

/**
 * Creates an Octokit instance for anonymous public reads,
 * using a server-side only service token.
 */
export async function getAnonymousOctokit() {
  const token = process.env.GITHUB_SERVICE_TOKEN;

  if (!token) {
    throw new ServiceTokenMissingError();
  }

  const octokit = new Octokit({
    auth: token,
    log: {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: (msg: unknown, ...args: unknown[]) => {
        if (typeof msg === "string" && msg.includes(" - 404 with id ")) {
          return;
        }
        console.error(msg, ...args);
      },
    },
  });

  octokit.hook.error("request", async (error) => {
    if (isGitHubAuthError(error)) {
      throw new AuthenticationRequiredError("Service token authentication failed.");
    }
    throw error;
  });

  return octokit;
}

// ---------------------------------------------------------------------------
// Repository content helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves the contents of a path within a repository.
 */
export async function getRepositoryContent(owner: string, repo: string, path: string = "", ref?: string) {
  const octokit = await getOctokit();
  
  const attemptRequest = async (retries = 2, delay = 500): Promise<unknown> => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ...(ref ? { ref } : {})
      });
      return data;
    } catch (error) {
      if (isHttpError(error) && error.status === 404) {
        return null;
      }
      if (isHttpError(error) && [502, 503, 504].includes(error.status) && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptRequest(retries - 1, delay * 2);
      }
      // Preserve status and message
      throw error;
    }
  };

  return attemptRequest();
}

/**
 * Retrieves the default branch of the repository.
 */
export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const octokit = await getOctokit();
  const repository = await octokit.rest.repos.get({
    owner,
    repo,
  });
  return repository.data.default_branch;
}

export class RootCogNotFoundError extends Error {
  constructor(message = "RootCog not found in index") {
    super(message);
    this.name = "RootCogNotFoundError";
  }
}

export interface CogIndexEntry {
  id: string;
  title?: string;
  path: string;
  project?: string;
  deletedAt?: string;
  cogmitPublished?: string;
  cogmitId?: string;
  slug?: string;
}

export async function getRootCogIndexEntry(owner: string, repo: string, cogId: string): Promise<CogIndexEntry> {
  const octokit = await getOctokit();
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "cogsIndex.json",
    });
    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      const indexObj = JSON.parse(contentStr);
      const cogInfo = indexObj.cogs?.find((c: CogIndexEntry) => c.id === cogId);
      if (cogInfo && !cogInfo.deletedAt) {
        return cogInfo;
      }
    }
  } catch (error) {
    if (isHttpError(error) && error.status === 404) {
      throw new RootCogNotFoundError("cogsIndex.json not found");
    }
    throw error;
  }
  throw new RootCogNotFoundError();
}

/**
 * Resolves the authoritative path of a RootCog from cogsIndex.json.
 */
export async function resolveRootCogPath(owner: string, repo: string, cogId: string): Promise<string> {
  const entry = await getRootCogIndexEntry(owner, repo, cogId);
  return entry.path;
}

// ---------------------------------------------------------------------------
// Cogmit structure validation
// ---------------------------------------------------------------------------

/**
 * Validates if the connected repository contains the expected Cogmit structure.
 * Checks for the presence of `cogsIndex.json`.
 */
export async function validateCogmitRepository(owner: string, repo: string): Promise<boolean> {
  const octokit = await getOctokit();
  try {
    await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "cogsIndex.json",
    });
    return true;
  } catch (error: unknown) {
    if (isHttpError(error) && error.status === 404) {
      return false;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Repository listing (shared by Dashboard and Connect flow)
// ---------------------------------------------------------------------------

/**
 * Lists repositories accessible to the authenticated user.
 * This is the shared implementation used by both the Dashboard and the
 * Connect-to-existing-repo flow.
 */
export async function listUserRepositories(perPage: number = 50) {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: perPage,
  });
  return data;
}

/**
 * Checks whether the canonical YVSApps_Cogmit_Data repository exists inside
 * the authenticated user's account.
 *
 * Returns the repository object if found, or `null` if not.
 */
export async function detectCogmitRepository() {
  const octokit = await getOctokit();
  const user = await getAuthenticatedUser();
  try {
    const { data } = await octokit.rest.repos.get({
      owner: user.login,
      repo: COGMIT_REPO_NAME,
    });
    return data;
  } catch (error: unknown) {
    if (isHttpError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Cogmit data status — the full decision tree
// ---------------------------------------------------------------------------

export type CogmitDataStatus =
  | { state: "ready"; owner: string; repo: string; isEmpty: boolean }
  | { state: "repo_missing" }
  | { state: "repo_invalid"; owner: string; repo: string };

/**
 * Determines the current state of the user's canonical Cogmit data setup.
 *
 * This implements the first-login / home-page decision tree:
 *   1. Does YVSApps_Cogmit_Data exist?
 *   2. Does YVSApps_Cogmit_Data contain a valid Cogmit structure?
 */
export async function getCogmitDataStatus(): Promise<CogmitDataStatus> {
  const user = await getAuthenticatedUser();
  const owner = user.login;

  // Step 1: Check if YVSApps_Cogmit_Data exists
  const repo = await detectCogmitRepository();
  if (!repo) {
    return { state: "repo_missing" };
  }

  // Step 2: Validate the Cogmit structure
  const isValid = await validateCogmitRepository(owner, COGMIT_REPO_NAME);
  if (!isValid) {
    return { state: "repo_invalid", owner, repo: COGMIT_REPO_NAME };
  }

  // Step 3: Check if the repository is empty (zero cogs)
  let isEmpty = false;
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: COGMIT_REPO_NAME,
      path: "cogsIndex.json",
    });
    
    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      const indexObj = JSON.parse(contentStr);
      if (Array.isArray(indexObj.cogs) && indexObj.cogs.length === 0) {
        isEmpty = true;
      }
    }
  } catch (err) {
    console.error("Failed to check if repository is empty:", err);
  }

  return { state: "ready", owner, repo: COGMIT_REPO_NAME, isEmpty };
}

// ---------------------------------------------------------------------------
// Repository creation
// ---------------------------------------------------------------------------

/**
 * Creates the YVSApps_Cogmit_Data repository for the authenticated user.
 *
 * The repository is always created as **private**.
 *
 * This will fail if:
 * - A repository with the same name already exists
 */
export async function createCogmitRepository() {
  const octokit = await getOctokit();
  const user = await getAuthenticatedUser();
  const owner = user.login;

  // Safety: check if repo already exists to avoid overwriting
  const existing = await detectCogmitRepository();
  if (existing) {
    throw new Error(
      `Repository ${owner}/${COGMIT_REPO_NAME} already exists. ` +
      `Will not overwrite an existing repository.`
    );
  }

  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: COGMIT_REPO_NAME,
    description: "Cogmit application data — managed by Cogmit",
    private: true,
    auto_init: false, // Set to false so we can authoritatively create README.md ourselves
  });

  return data;
}

// ---------------------------------------------------------------------------
// Cogmit repository initialization
// ---------------------------------------------------------------------------

/**
 * Checks whether a repository contains existing non-Cogmit files that could
 * be overwritten by initialization. Returns true if the repo is empty or
 * contains only `.gitkeep`/`README.md`/`.gitignore` (i.e., safe to init).
 */
export async function isRepositorySafeToInitialize(owner: string, repo: string): Promise<boolean> {
  const octokit = await getOctokit();
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "",
    });

    if (!Array.isArray(data)) {
      // Single file at root — unusual, treat as not safe
      return false;
    }

    // Safe if only auto-generated files exist
    const safeFiles = new Set(["README.md", ".gitignore", ".gitkeep", "LICENSE"]);
    return data.every((item) => safeFiles.has(item.name));
  } catch (error: unknown) {
    if (isHttpError(error) && (error.status === 404 || error.status === 409)) {
      // Empty repo — safe
      return true;
    }
    throw error;
  }
}

const README_CONTENT = `# Cogmit Data Repository

This repository is Cogmit's persistent data repository. It is automatically managed by Cogmit.

---

# ⚠️ IMPORTANT — DO NOT DELETE THIS REPOSITORY MANUALLY

This repository is Cogmit's persistent data repository.

Cogmit depends on this repository to store and retrieve the user's Cogmit data.

Do NOT delete this repository manually from GitHub.

If the repository is manually deleted from GitHub, Cogmit can no longer access the repository or the data stored in it.

Deleting the repository is not the same as deleting one Cog or one Project.

Deleting the repository affects the entire Cogmit data repository.

---

# What This Repository Is

This repository (\\\`<username>/YVSApps_Cogmit_Data\\\`) is the Cogmit persistence boundary.
Cogmit uses the repository for persistent storage and Git history.
It contains the user's RootCogs, ChildCogs, Projects, navigation index, metadata, and deleted-Cog state where applicable.

---

# How Cogmit Uses It

The intended conceptual model is:

    User
      ↓
    GitHub account
      ↓
    YVSApps_Cogmit_Data
      ↓
    Projects
      ↓
    RootCogs
      ↓
    ChildCogs

The repository is the Cogmit product/data boundary.
GitHub provides persistent storage, Git history, commits, diffs, prior states, and filesystem organization.
Cogmit uses GitHub through its application/backend integration.

---

# Repository Details

Repository name:
YVSApps_Cogmit_Data

Repository location:
<GitHub username>/YVSApps_Cogmit_Data

This is the canonical Cogmit data repository name. The repository is created as a private GitHub repository under the user's personal GitHub account because it contains the user's Cogmit data.

---

# Repository Structure

    YVSApps_Cogmit_Data/
    ├── README.md
    ├── cogsIndex.json
    ├── projects/
    ├── NPPCogs/
    └── deletedCogs/

---

# cogsIndex.json

\\\`cogsIndex.json\\\` is the global Cog navigation/discovery index.
It is NOT the primary source of truth for RootCog content. It helps Cogmit discover and navigate RootCogs.
Current active RootCog navigation records contain:
- RootCog ID
- RootCog title
- immediate Project name
- RootCog path

---

# Projects

\\\`projects/\\\` contains Project directories. Projects are represented by directories.
A Project directly contains:
- \\\`projectData.json\\\`
- RootCog directories
- nested Project directories

There is NO \\\`projects/<Project>/cogs/\\\` layer.
Project directory names represent Project names (maximum 57 characters).

---

# RootCogs

A RootCog is represented by its own directory containing:
- \\\`rootCog.md\\\`: Canonical human-readable RootCog content/cognition.
- \\\`rootCogInfo.json\\\`: RootCog-specific metadata.
- \\\`children.json\\\`: Current ChildCog collection.

RootCog title maximum: 77 characters.

---

# ChildCogs

ChildCogs are currently stored collectively in \\\`children.json\\\`.

---

# NPPCogs

\\\`NPPCogs/\\\` means RootCogs with No Parent Project.
These are RootCogs that do not belong to a Project.
They are stored under \\\`NPPCogs/<RootCogId>/\\\` with:
- \\\`rootCog.md\\\`
- \\\`rootCogInfo.json\\\`
- \\\`children.json\\\`

---

# deletedCogs

\\\`deletedCogs\\\` contains deleted Cog state which has a defined lifecycle concept.
The current design records \\\`deletedAt\\\` and defines a 57-day deletion lifecycle.
Deferred / future implementation: The full login-time deletion checking, notification, logout behavior, and permanent deletion functionality are deferred.

---

# Git History

Git itself provides repository history.
Git provides commits, diffs, previous states, change history, and timestamps associated with commits.
Therefore Cogmit does not need to duplicate Git history in its JSON metadata.

---

# Repository Safety Rules

1. Do not delete the repository manually.
2. Do not rename the repository manually.
3. Do not move Cogmit's required folders manually.
4. Do not delete cogsIndex.json.
5. Do not rename rootCog.md.
6. Do not rename rootCogInfo.json.
7. Do not rename children.json.
8. Do not introduce a cogs/ directory under Projects.
9. Do not manually restructure Project/RootCog hierarchy unless Cogmit explicitly supports that operation.
10. Prefer Cogmit's UI for Cogmit data operations.

---

# Why You Should Not Delete This Repository

Delete a Cog = remove/manage one Cognition object through Cogmit
Delete the GitHub repository = remove the persistence boundary containing the Cogmit dataset

Deleting the repository is a repository-level destructive operation.

---

# If You Want to Stop Using Cogmit

If you want to stop using Cogmit, do not delete this repository manually. Leave the repository intact until Cogmit provides or documents an appropriate repository-management operation.

---

# Technical Principle

Filesystem → structure
Markdown → cognition
JSON → domain metadata
cogsIndex.json → navigation
Git → history
`;

/**
 * Initializes a new Cogmit repository structure with the minimum required files.
 *
 * Creates:
 * - README.md
 * - cogsIndex.json
 * - projects/.gitkeep
 * - NPPCogs/.gitkeep
 * - deletedCogs/.gitkeep
 *
 * Each file is only created if it does not already exist (no overwriting).
 */
export async function initializeCogmitRepository(owner: string, repo: string) {
  const octokit = await getOctokit();
  
  const initialIndex = {
    cogs: [],
  };

  const createCommit = async (path: string, content: string, message: string) => {
    try {
      await octokit.rest.repos.getContent({ owner, repo, path });
      // File exists, do nothing
    } catch (err: unknown) {
      if (isHttpError(err) && (err.status === 404 || err.status === 409)) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString("base64"),
        });
      } else {
        throw err;
      }
    }
  };

  await createCommit(
    "README.md",
    README_CONTENT,
    "Initial commit: Create README.md"
  );

  await createCommit(
    "cogsIndex.json", 
    JSON.stringify(initialIndex, null, 2), 
    "Initial commit: Create cogsIndex.json"
  );
  
  await createCommit(
    "projects/.gitkeep", 
    "", 
    "Initial commit: Create projects directory"
  );
  
  await createCommit(
    "NPPCogs/.gitkeep", 
    "", 
    "Initial commit: Create NPPCogs directory"
  );

  await createCommit(
    "deletedCogs/.gitkeep", 
    "", 
    "Initial commit: Create deletedCogs directory"
  );
}

// ---------------------------------------------------------------------------
// Full initialization flow
// ---------------------------------------------------------------------------

export type InitCogmitResult =
  | { success: true; owner: string; repo: string }
  | { success: false; reason: "repo_already_exists_not_cogmit" }
  | { success: false; reason: "repo_has_unrelated_files" }
  | { success: false; reason: "error"; message: string };

/**
 * The full "Initiate Cogmit Data" flow.
 *
 * 1. Ensure YVSApps_Cogmit_Data exists (create if missing)
 * 2. Initialize the Cogmit structure (if not already present)
 */
export async function initiateCogmitData(): Promise<InitCogmitResult> {
  const user = await getAuthenticatedUser();
  const owner = user.login;

  // Step 1: Check if YVSApps_Cogmit_Data already exists
  const existingRepo = await detectCogmitRepository();

  if (existingRepo) {
    // Repo exists — check if it already has valid Cogmit structure
    const isValid = await validateCogmitRepository(owner, COGMIT_REPO_NAME);
    if (isValid) {
      // Already a valid Cogmit repo — just use it
      return { success: true, owner, repo: COGMIT_REPO_NAME };
    }

    // Repo exists but doesn't have Cogmit structure — check if safe to init
    const safe = await isRepositorySafeToInitialize(owner, COGMIT_REPO_NAME);
    if (!safe) {
      return { success: false, reason: "repo_has_unrelated_files" };
    }

    // Safe to initialize existing empty repo
    await initializeCogmitRepository(owner, COGMIT_REPO_NAME);
    return { success: true, owner, repo: COGMIT_REPO_NAME };
  }

  // Step 2: Create the repo and initialize
  await createCogmitRepository();
  await initializeCogmitRepository(owner, COGMIT_REPO_NAME);

  return { success: true, owner, repo: COGMIT_REPO_NAME };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjects(): Promise<string[]> {
  const octokit = await getOctokit();
  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return [];

  try {
    const { owner, repo } = status;
    const defaultBranch = await getDefaultBranch(owner, repo);
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });

    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: "true",
    });

    const projects = treeData.tree
      .filter(
        (node) =>
          node.path?.startsWith("projects/") &&
          node.path?.endsWith("/projectData.json")
      )
      .map((node) => {
        const path = node.path!;
        return path.substring("projects/".length, path.length - "/projectData.json".length);
      });

    // Ensure we also grab projects that might not have projectData.json but exist as a dir directly under projects (if any)? 
    // The prompt says "create the projectData.json according to the existing implementation". 
    // And "projectData.json contains Project-specific metadata".
    // So all projects will have projectData.json.

    // Sort to keep hierarchy logically ordered.
    return projects.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (!isHttpError(error) || (error.status !== 404 && error.status !== 409)) {
      console.error("Failed to get projects", error);
    }
    return [];
  }
}
