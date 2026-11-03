"use server";
import {
  MAX_ROOTCOG_TITLE_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  ERROR_TITLE_REQUIRED,
  ERROR_TITLE_TOO_LONG,
  ERROR_PROJECT_NAME_REQUIRED,
  ERROR_PROJECT_NAME_TOO_LONG,
  ERROR_PROJECT_ALREADY_EXISTS,
  ERROR_REPO_NOT_READY,
  ERROR_UNAUTHORIZED,
  NO_PARENT_PROJECT,
  DIR_PROJECTS,
  DIR_NPP_COGS,
  FILE_PROJECT_DATA,
  FILE_ROOT_COG_MD,
  FILE_COGS_INDEX,
  ROUTE_LOGIN,
} from "@/constants";

import { auth } from "@/auth";
import { getCogmitDataStatus, getOctokit, getProjects } from "@/lib/github";
import { redirect } from "next/navigation";

export async function fetchProjectsList() {
  const session = await auth();
  if (!session) return [];
  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return [];
  try {
    return await getProjects();
  } catch (error) {
    console.error("Failed to fetch projects list", error);
    return [];
  }
}

export async function createProjectAction(projectName: string) {
  const session = await auth();
  if (!session) return { success: false, error: ERROR_UNAUTHORIZED };
  if (!projectName || projectName.trim().length === 0) return { success: false, error: ERROR_PROJECT_NAME_REQUIRED };
  if (projectName.length > MAX_PROJECT_NAME_LENGTH) return { success: false, error: ERROR_PROJECT_NAME_TOO_LONG };

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return { success: false, error: ERROR_REPO_NOT_READY };

  const octokit = await getOctokit();
  const { owner, repo } = status;

  try {
    try {
      await octokit.rest.repos.getContent({ owner, repo, path: `${DIR_PROJECTS}/${projectName}/${FILE_PROJECT_DATA}` });
      return { success: false, error: ERROR_PROJECT_ALREADY_EXISTS };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    const projectDataObj = {
      name: projectName,
      createdAt: new Date().toISOString()
    };
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${DIR_PROJECTS}/${projectName}/${FILE_PROJECT_DATA}`,
      message: `Create project '${projectName}'`,
      content: Buffer.from(JSON.stringify(projectDataObj, null, 2)).toString("base64"),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to create project", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function createNewRootCog(title: string, project: string, content: string, isPublic: boolean) {
  const session = await auth();
  if (!session) {
    redirect(ROUTE_LOGIN);
  }

  if (!title || title.trim().length === 0) {
    return { success: false, error: ERROR_TITLE_REQUIRED };
  }
  if (title.length > MAX_ROOTCOG_TITLE_LENGTH) {
    return { success: false, error: ERROR_TITLE_TOO_LONG };
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    return { success: false, error: ERROR_REPO_NOT_READY };
  }

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const cogId = `${owner}_${timestamp}`;
  const pathPrefix = `${DIR_NPP_COGS}/${cogId}`;

  try {
    // 1. Create rootCog.md
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${pathPrefix}/${FILE_ROOT_COG_MD}`,
      message: `Create ${cogId} rootCog.md`,
      content: Buffer.from(content || `# ${title}\n\n`).toString("base64"),
    });



    // 2. Update cogsIndex.json
    let indexObj: { cogs: { id: string, title?: string, path: string, project?: string, cogmitPublished?: string, cogmitId?: string, slug?: string }[] } = { cogs: [] };
    let indexSha = "";
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: FILE_COGS_INDEX,
      });
      if (data && !Array.isArray(data) && "content" in data) {
        const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
        indexObj = JSON.parse(contentStr);
        indexSha = data.sha;
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    const cogmitId = `cogmit_${timestamp}`;
    const slug = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    indexObj.cogs.push({
      id: cogId,
      title: title,
      path: pathPrefix,
      project: project !== NO_PARENT_PROJECT ? project : undefined,
      ...(isPublic ? {
        cogmitPublished: now.toISOString(),
        cogmitId: cogmitId,
        slug: slug
      } : {})
    });

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: FILE_COGS_INDEX,
      message: `Update cogsIndex.json with ${cogId}`,
      content: Buffer.from(JSON.stringify(indexObj, null, 2)).toString("base64"),
      ...(indexSha ? { sha: indexSha } : {}),
    });

    if (isPublic) {
      return { 
        success: true, 
        cogId, 
        cogmitId, 
        slug, 
        author: owner 
      };
    }

    return { success: true, cogId };
  } catch (error) {
    console.error("Failed to create new RootCog", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
