"use server";

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
  if (!session) return { success: false, error: "Unauthorized" };
  if (!projectName || projectName.trim().length === 0) return { success: false, error: "Project name is required" };
  if (projectName.length > 57) return { success: false, error: "Project name must be 57 characters or less" };

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return { success: false, error: "Cogmit repository is not ready" };

  const octokit = await getOctokit();
  const { owner, repo } = status;

  try {
    try {
      await octokit.rest.repos.getContent({ owner, repo, path: `projects/${projectName}/projectData.json` });
      return { success: false, error: "Project already exists" };
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    const projectDataObj = {
      name: projectName,
      createdAt: new Date().toISOString()
    };
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `projects/${projectName}/projectData.json`,
      message: `Create project '${projectName}'`,
      content: Buffer.from(JSON.stringify(projectDataObj, null, 2)).toString("base64"),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create project", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function createNewRootCog(title: string, project: string, content: string, isPublic: boolean) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    return { success: false, error: "Cogmit repository is not ready" };
  }

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const cogId = `${owner}_${timestamp}`;
  const pathPrefix = `NPPCogs/${cogId}`;

  try {
    // 1. Create rootCog.md
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${pathPrefix}/rootCog.md`,
      message: `Create ${cogId} rootCog.md`,
      content: Buffer.from(content || `# ${title}\n\n`).toString("base64"),
    });

    // 2. Create rootCogInfo.json
    const info = {
      id: cogId,
      title: title,
      project: project,
      createdAt: new Date().toISOString(),
    };
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${pathPrefix}/rootCogInfo.json`,
      message: `Create ${cogId} rootCogInfo.json`,
      content: Buffer.from(JSON.stringify(info, null, 2)).toString("base64"),
    });

    // 3. Create children.json
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${pathPrefix}/children.json`,
      message: `Create ${cogId} children.json`,
      content: Buffer.from(JSON.stringify([], null, 2)).toString("base64"),
    });

    // 4. Update cogsIndex.json
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let indexObj = { cogs: [] as any[] };
    let indexSha = "";
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "cogsIndex.json",
      });
      if (data && !Array.isArray(data) && "content" in data) {
        const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
        indexObj = JSON.parse(contentStr);
        indexSha = data.sha;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    indexObj.cogs.push({
      id: cogId,
      title: title,
      path: pathPrefix,
    });

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "cogsIndex.json",
      message: `Update cogsIndex.json with ${cogId}`,
      content: Buffer.from(JSON.stringify(indexObj, null, 2)).toString("base64"),
      ...(indexSha ? { sha: indexSha } : {}),
    });

    // 5. Update cogmitsIndex.json if isPublic
    if (isPublic) {
      const cogmitId = `cogmit_${timestamp}`;

      let publicIndexObj = { cogs: [] as any[] };
      let publicIndexSha = "";
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: "cogmitsIndex.json",
        });
        if (data && !Array.isArray(data) && "content" in data) {
          const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
          publicIndexObj = JSON.parse(contentStr);
          publicIndexSha = data.sha;
        }
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }
      
      publicIndexObj.cogs.push({
        id: cogmitId,
        sourceCogId: cogId,
        title: title,
        project: project,
        path: pathPrefix,
        publishedAt: now.toISOString(),
        author: owner,
      });

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "cogmitsIndex.json",
        message: `Publish ${cogId} to cogmitsIndex.json`,
        content: Buffer.from(JSON.stringify(publicIndexObj, null, 2)).toString("base64"),
        ...(publicIndexSha ? { sha: publicIndexSha } : {}),
      });
      return { 
        success: true, 
        cogId, 
        cogmitId, 
        slug: encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-')), 
        author: owner 
      };
    }

    return { success: true, cogId };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to create new RootCog", error);
    return { success: false, error: error.message };
  }
}
