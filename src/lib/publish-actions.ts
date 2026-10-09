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

import { generateCogmitId } from "./id-generator";

async function getAuthenticatedOwner() {
  const octokit = await getOctokit();

  const { data: { login: owner } } =
    await octokit.rest.users.getAuthenticated();

  return {
    octokit,
    owner,
  };
}


export async function writePublishedCogmitMarkdown(
  cogId: string,
  title: string,
  description: string,
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

  const { octokit, owner } = await getAuthenticatedOwner();

  const isPrivateArchitecture = status.repo === COGMIT_REPO_PRIVATE;
  const targetRepo = isPrivateArchitecture ? COGMIT_REPO_PUBLISHED : COGMIT_REPO_PUBLIC;
  const sourceRepo = status.repo;

  const branch = await getDefaultBranch(owner, targetRepo);
  const sourceBranch = await getDefaultBranch(owner, sourceRepo);

  // 1. Check if already published
  let existingCogmitId: string | null = null;
  try {
    const { data: sourceIndexData } = await octokit.rest.repos.getContent({
      owner,
      repo: sourceRepo,
      path: "cogsIndex.json",
      ref: sourceBranch,
    });
    if (!Array.isArray(sourceIndexData) && sourceIndexData.type === "file") {
      const sourceIndex = JSON.parse(Buffer.from(sourceIndexData.content, "base64").toString("utf-8"));
      const indexCog = sourceIndex.cogs?.find((c: Record<string, unknown>) => c.id === cogId);
      if (indexCog && indexCog.cogmitId) {
        existingCogmitId = String(indexCog.cogmitId);
      }
    }
  } catch (error) {
    if (getErrorStatus(error) !== 404) throw error;
  }

  let cogmitId = existingCogmitId;

  // 2. If not published, generate a unique ID
  if (!cogmitId) {
    let indexObj: { cogmits: Record<string, unknown>[] } = { cogmits: [] };
    try {
      const { data: indexData } = await octokit.rest.repos.getContent({
        owner,
        repo: targetRepo,
        path: "cogmits/cogmitsIndex.json",
        ref: branch,
      });
      if (!Array.isArray(indexData) && indexData.type === "file") {
        indexObj = JSON.parse(Buffer.from(indexData.content, "base64").toString("utf-8"));
      }
    } catch (error) {
      if (getErrorStatus(error) !== 404) throw error;
    }

    let suffix = 1;
    let candidateId = generateCogmitId(owner, new Date());
    while (indexObj.cogmits.some(c => c.cogmitId === candidateId)) {
      suffix++;
      candidateId = generateCogmitId(owner, new Date(), suffix);
    }
    cogmitId = candidateId;
  }

  const targetPath = `cogmits/${cogmitId}.md`;
  let mdSha = "";

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: targetRepo,
      path: targetPath,
      ref: branch,
    });

    if (!Array.isArray(data) && data.type === "file") {
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
      content: Buffer.from(content || `# ${title}\n\n`).toString("base64"),
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
    targetPath,
    author: owner,
  };
}

export async function updateCogmitsIndex(
  cogId: string,
  title: string,
  description: string,
  cogmitId: string,
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

  const { octokit, owner } = await getAuthenticatedOwner();

  const isPrivateArchitecture = status.repo === COGMIT_REPO_PRIVATE;
  const targetRepo = isPrivateArchitecture ? COGMIT_REPO_PUBLISHED : COGMIT_REPO_PUBLIC;
  const branch = await getDefaultBranch(owner, targetRepo);

  let indexSha = "";
  let indexObj: { cogmits: Record<string, unknown>[] } = { cogmits: [] };

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: targetRepo,
      path: "cogmits/cogmitsIndex.json",
      ref: branch,
    });

    if (!Array.isArray(data) && data.type === "file") {
      indexSha = data.sha;
      indexObj = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    }
  } catch (error) {
    if (getErrorStatus(error) !== 404) throw error;
  }

  if (!Array.isArray(indexObj.cogmits)) {
    indexObj.cogmits = [];
  }

  const existingEntry = indexObj.cogmits.find(
    (entry) => entry && (entry.cogmitId === cogmitId || entry.id === cogmitId)
  );

  const publishedAt = new Date().toISOString();

  if (existingEntry) {
    delete existingEntry.id;
    delete existingEntry.sourceCogId;
    delete existingEntry.slug;
    existingEntry.ownerId = owner;
    existingEntry.cogmitId = cogmitId;
    existingEntry.rootCogId = cogId;
    existingEntry.title = title;
    existingEntry.description = description;
    existingEntry.publishedAt = publishedAt;
    existingEntry.path = targetPath;
  } else {
    indexObj.cogmits.push({
      ownerId: owner,
      cogmitId,
      rootCogId: cogId,
      title,
      description,
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
  cogmitId: string
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
    cogs: Record<string, unknown>[];
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
  delete indexCog.slug;
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