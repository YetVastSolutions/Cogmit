"use server";

import { auth } from "@/auth";
import { getCogmitDataStatus, getOctokit } from "@/lib/github";
import { redirect } from "next/navigation";

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

    // 5. Update publicCogsIndex.json if isPublic
    if (isPublic) {
      let publicIndexObj = { cogs: [] as any[] };
      let publicIndexSha = "";
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: "publicCogsIndex.json",
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
        id: cogId,
        title: title,
        project: project,
        path: pathPrefix,
        publishedAt: new Date().toISOString(),
      });

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "publicCogsIndex.json",
        message: `Publish ${cogId} to publicCogsIndex.json`,
        content: Buffer.from(JSON.stringify(publicIndexObj, null, 2)).toString("base64"),
        ...(publicIndexSha ? { sha: publicIndexSha } : {}),
      });
    }

    return { success: true, cogId };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to create new RootCog", error);
    return { success: false, error: error.message };
  }
}
