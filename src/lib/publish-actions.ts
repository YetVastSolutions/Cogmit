"use server";

import { auth } from "@/auth";
import {
  getCogmitDataStatus,
  getOctokit,
  COGMIT_REPO_PRIVATE,
  COGMIT_REPO_PUBLIC,
  COGMIT_REPO_PUBLISHED,
  getDefaultBranch,
} from "@/lib/github";
import { revalidatePath } from "next/cache";

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status = (error as { status?: unknown }).status;

    return typeof status === "number" ? status : undefined;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || "cogmit";
}

async function getAuthenticatedOwner() {
  const octokit = await getOctokit();

  const { data: { login: owner } } =
    await octokit.rest.users.getAuthenticated();

  return {
    octokit,
    owner,
  };
}

async function readJsonFile(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ sha: string; value: any } | null> {
  const octokit = await getOctokit();

  try {
    const { data } =
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

    if (
      Array.isArray(data) ||
      data.type !== "file" ||
      !data.content
    ) {
      throw new Error(
        `GitHub path is not a readable file: ${path}`
      );
    }

    return {
      sha: data.sha,
      value: JSON.parse(
        Buffer.from(data.content, "base64").toString("utf-8")
      ),
    };
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
}


export async function writePublishedCogmitMarkdown(
  title: string,
  content: string
) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const status = await getCogmitDataStatus();

  if (status.state !== "ready") {
    throw new Error("Cogmit repository is not ready");
  }

  const { octokit, owner } =
    await getAuthenticatedOwner();

  const isPrivateArchitecture =
    status.repo === COGMIT_REPO_PRIVATE;

  const targetRepo = isPrivateArchitecture
    ? COGMIT_REPO_PUBLISHED
    : COGMIT_REPO_PUBLIC;

  const branch = await getDefaultBranch(
    owner,
    targetRepo
  );

  const now = new Date();

  const timestamp = now
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);

  const cogmitId =
    `cogmit_${timestamp}`;

  const slug = slugify(title);

  const targetPath =
    `cogmits/${cogmitId}_${slug}.md`;

  let mdSha = "";

  try {
    const { data } =
      await octokit.rest.repos.getContent({
        owner,
        repo: targetRepo,
        path: targetPath,
        ref: branch,
      });

    if (
      !Array.isArray(data) &&
      data.type === "file"
    ) {
      mdSha = data.sha;
    }
  } catch (error) {
    if (getErrorStatus(error) !== 404) {
      throw error;
    }
  }

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: targetRepo,
      path: targetPath,
      message: `Publish cogmit ${cogmitId}`,
      content: Buffer.from(
        content || `# ${title}\n\n`
      ).toString("base64"),
      ...(mdSha ? { sha: mdSha } : {}),
      branch,
    });
  } catch (error) {
    console.error(`GitHub publication failure
operation: WRITE PUBLISHED COGMIT
source repository: ${status.repo}
target repository: ${targetRepo}
path: ${targetPath}
branch: ${branch}
status: ${getErrorStatus(error) || "unknown"}
message: ${getErrorMessage(error)}`);

    throw error;
  }

  return {
    success: true,
    cogmitId,
    slug,
    targetPath,
    author: owner,
  };
}

export async function updateCogmitsIndex(
  cogId: string,
  title: string,
  cogmitId: string,
  slug: string,
  targetPath: string
) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const status = await getCogmitDataStatus();

  if (status.state !== "ready") {
    throw new Error("Cogmit repository is not ready");
  }

  const { octokit, owner } =
    await getAuthenticatedOwner();

  const isPrivateArchitecture =
    status.repo === COGMIT_REPO_PRIVATE;

  const targetRepo = isPrivateArchitecture
    ? COGMIT_REPO_PUBLISHED
    : COGMIT_REPO_PUBLIC;

  const branch = await getDefaultBranch(
    owner,
    targetRepo
  );

  let indexSha = "";

  let indexObj: {
    cogmits: any[];
  } = {
    cogmits: [],
  };

  try {
    const { data } =
      await octokit.rest.repos.getContent({
        owner,
        repo: targetRepo,
        path: "cogmits/cogmitsIndex.json",
        ref: branch,
      });

    if (
      !Array.isArray(data) &&
      data.type === "file"
    ) {
      indexSha = data.sha;

      indexObj = JSON.parse(
        Buffer.from(
          data.content,
          "base64"
        ).toString("utf-8")
      );
    }
  } catch (error) {
    if (getErrorStatus(error) !== 404) {
      throw error;
    }
  }

  if (!Array.isArray(indexObj.cogmits)) {
    indexObj.cogmits = [];
  }

  const existingEntry =
    indexObj.cogmits.find(
      (entry) =>
        entry &&
        (entry.cogmitId === cogmitId || entry.id === cogmitId)
    );

  const publishedAt =
    new Date().toISOString();

  if (existingEntry) {
    delete existingEntry.id;
    delete existingEntry.sourceCogId;
    existingEntry.cogmitId = cogmitId;
    existingEntry.title = title;
    existingEntry.slug = slug;
    existingEntry.publishedAt = publishedAt;
    existingEntry.path = targetPath;
  } else {
    indexObj.cogmits.push({
      cogmitId,
      title,
      slug,
      publishedAt,
      path: targetPath,
    });
  }

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: targetRepo,
      path: "cogmits/cogmitsIndex.json",
      message: `Update cogmitsIndex.json with ${cogmitId}`,
      content: Buffer.from(
        JSON.stringify(indexObj, null, 2)
      ).toString("base64"),
      ...(indexSha ? { sha: indexSha } : {}),
      branch,
    });
  } catch (error) {
    console.error(`GitHub publication failure
operation: UPDATE PUBLISHED COGMIT INDEX
source repository: ${status.repo}
target repository: ${targetRepo}
path: cogmits/cogmitsIndex.json
branch: ${branch}
status: ${getErrorStatus(error) || "unknown"}
message: ${getErrorMessage(error)}`);

    throw error;
  }

  return {
    success: true,
  };
}

export async function updateSourceCogsIndexStatus(
  cogId: string,
  cogmitId: string,
  slug: string
) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const octokit = await getOctokit();

  const status =
    await getCogmitDataStatus();

  if (status.state !== "ready") {
    throw new Error(
      "Cogmit repository is not ready"
    );
  }

  const owner = status.owner;
  const repo = status.repo;

  const branch = await getDefaultBranch(
    owner,
    repo
  );

  let indexSha = "";

  let indexObj: {
    cogs: any[];
  } = {
    cogs: [],
  };

  try {
    const { data } =
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "cogsIndex.json",
        ref: branch,
      });

    if (
      !Array.isArray(data) &&
      data.type === "file"
    ) {
      indexSha = data.sha;

      indexObj = JSON.parse(
        Buffer.from(
          data.content,
          "base64"
        ).toString("utf-8")
      );
    }
  } catch (error) {
    if (getErrorStatus(error) !== 404) {
      throw error;
    }
  }

  if (!Array.isArray(indexObj.cogs)) {
    indexObj.cogs = [];
  }

  const indexCog =
    indexObj.cogs.find(
      (c) =>
        c &&
        c.id === cogId
    );

  if (!indexCog) {
    throw new Error(
      `Cog ${cogId} was not found in cogsIndex.json`
    );
  }

  indexCog.cogmitId = cogmitId;
  indexCog.slug = slug;
  indexCog.cogmitPublished =
    new Date().toISOString();

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "cogsIndex.json",
      message: `Update publication state for ${cogId}`,
      content: Buffer.from(
        JSON.stringify(indexObj, null, 2)
      ).toString("base64"),
      ...(indexSha ? { sha: indexSha } : {}),
      branch,
    });
  } catch (error) {
    console.error(`GitHub publication failure
operation: UPDATE SOURCE COG INDEX
source repository: ${repo}
target repository: ${repo}
path: cogsIndex.json
branch: ${branch}
status: ${getErrorStatus(error) || "unknown"}
message: ${getErrorMessage(error)}`);

    throw error;
  }

  revalidatePath(
    `/myCogs/${cogId}/viewCog`
  );

  return {
    success: true,
  };
}