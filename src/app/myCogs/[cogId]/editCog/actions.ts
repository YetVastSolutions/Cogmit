"use server";

import { auth } from "@/auth";
import { getCogmitDataStatus, getOctokit, resolveRootCogPath, getDefaultBranch } from "@/lib/github";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveRootCog(
  cogId: string,
  title: string,
  project: string,
  content: string,
  isPublic: boolean
) {
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

  try {
    let cogPath = "";
    try {
      cogPath = await resolveRootCogPath(owner, repo, cogId);
    } catch {
      return { success: false, error: "Cog not found in index" };
    }

    // 1. Update rootCog.md
    let mdSha = "";
    try {
      const { data: mdData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: `${cogPath}/rootCog.md`,
      });
      if (mdData && !Array.isArray(mdData) && "sha" in mdData) {
        mdSha = mdData.sha;
      }
    } catch {}

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${cogPath}/rootCog.md`,
      message: `Update ${cogId} rootCog.md`,
      content: Buffer.from(content).toString("base64"),
      ...(mdSha ? { sha: mdSha } : {}),
    });

    // 2. Update cogsIndex.json
    let indexObj = { cogs: [] as { id: string, title?: string, path?: string, project?: string, cogmitPublished?: string, cogmitId?: string, slug?: string }[] };
    let indexSha = "";
    try {
      const { data: indexData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "cogsIndex.json",
      });
      if (indexData && !Array.isArray(indexData) && "content" in indexData) {
        indexSha = indexData.sha;
        indexObj = JSON.parse(Buffer.from(indexData.content, "base64").toString("utf-8"));
      }
    } catch {}
    
    const indexCog = indexObj.cogs?.find((c) => c.id === cogId);
    let indexUpdated = false;
    let outCogmitId = indexCog?.cogmitId;
    let outSlug = indexCog?.slug;

    if (indexCog) {
      if (indexCog.title !== title) {
        indexCog.title = title;
        indexUpdated = true;
      }
      const actualProject = project !== "No Parent Project" ? project : undefined;
      if (indexCog.project !== actualProject) {
        indexCog.project = actualProject;
        indexUpdated = true;
      }

      if (isPublic) {
        const now = new Date();
        if (!indexCog.cogmitPublished) {
          const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
          outCogmitId = `cogmit_${timestamp}`;
        }
        outSlug = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
        
        indexCog.cogmitPublished = now.toISOString();
        indexCog.cogmitId = outCogmitId;
        indexCog.slug = outSlug;
        indexUpdated = true;
      }
    }

    if (indexUpdated) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "cogsIndex.json",
        message: `Update cogsIndex.json for ${cogId}`,
        content: Buffer.from(JSON.stringify(indexObj, null, 2)).toString("base64"),
        ...(indexSha ? { sha: indexSha } : {}),
      });
    }

    if (isPublic && outCogmitId && outSlug) {
      revalidatePath(`/myCogs/${cogId}/viewCog`);
      return { 
        success: true, 
        cogmitId: outCogmitId, 
        slug: outSlug, 
        author: owner 
      };
    }

    revalidatePath(`/myCogs/${cogId}/viewCog`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update RootCog", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update RootCog" };
  }
}

export async function createProjectAndMoveCog(
  cogId: string,
  projectName: string
) {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (!projectName || projectName.trim().length === 0) {
    return { success: false, error: "Project name is required" };
  }

  if (projectName.length > 57) {
    return { success: false, error: "Project name must be 57 characters or less" };
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    return { success: false, error: "Cogmit repository is not ready" };
  }

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  try {
    const defaultBranch = await getDefaultBranch(owner, repo);
    
    // 1. Get current index and find cog
    let indexObj = { cogs: [] as { id: string, title?: string, path?: string, project?: string, cogmitPublished?: string, cogmitId?: string, slug?: string }[] };
    let indexData;
    try {
      const res = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "cogsIndex.json",
      });
      indexData = res.data;
    } catch {
      return { success: false, error: "cogsIndex.json could not be read." };
    }
    
    if (indexData && !Array.isArray(indexData) && "content" in indexData) {
      const contentStr = Buffer.from(indexData.content, "base64").toString("utf-8");
      indexObj = JSON.parse(contentStr);
    } else {
      return { success: false, error: "cogsIndex.json missing or invalid" };
    }

    const indexCog = indexObj.cogs?.find((c) => c.id === cogId);
    if (!indexCog) {
      return { success: false, error: "Unable to create the project because the current Cog could not be located in GitHub." };
    }

    let oldPath;
    try {
      oldPath = await resolveRootCogPath(owner, repo, cogId);
    } catch {
      return { success: false, error: "Unable to create the project because the current Cog could not be located in GitHub." };
    }

    const newPath = `projects/${projectName}/${cogId}`;

    if (oldPath === newPath) {
      return { success: false, error: "Cog is already in this project" };
    }

    // 2. Fetch old cog files to move them
    let oldFiles: { name: string, type: string, sha: string }[] = [];
    try {
      const { data: dirData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: oldPath,
      });
      if (Array.isArray(dirData)) {
        oldFiles = dirData;
      } else {
        return { success: false, error: "Current RootCog path mismatch (not a directory)" };
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 404) {
        return { success: false, error: "RootCog no longer exists at old path" };
      }
      throw e;
    }

    // 3. Ensure target cog doesn't exist
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: newPath,
      });
      return { success: false, error: "Target RootCog already exists at destination" };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    // Ensure target projectData doesn't already exist to avoid silently overwriting, 
    // BUT we can have a project already exist and that's okay according to the prompt?
    // Wait, the prompt says "If a project with the same name already exists at the same hierarchy level, do not silently overwrite it. Show a clear validation/error message."
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: `projects/${projectName}/projectData.json`,
      });
      return { success: false, error: "Project already exists" };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    // 4. Create blobs and tree
    let baseCommitSha;
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      baseCommitSha = refData.object.sha;
    } catch {
      return { success: false, error: "Unable to create the project because the repository branch could not be resolved." };
    }
    
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    const treeUpdates: { path: string, mode: "100644" | "100755" | "040000" | "160000" | "120000", sha: string | null }[] = [];

    // Delete old files, create new files pointing to same blobs
    for (const file of oldFiles) {
      if (file.type === "file") {
        treeUpdates.push({
          path: `${oldPath}/${file.name}`,
          mode: "100644",
          sha: null, // delete
        });
        
        const newFileContentSha = file.sha;
        

        
        treeUpdates.push({
          path: `${newPath}/${file.name}`,
          mode: "100644",
          sha: newFileContentSha, // copy blob
        });
      }
    }

    // Create projectData.json
    const projectDataObj = {
      name: projectName,
      createdAt: new Date().toISOString()
    };
    const { data: projectDataBlob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: JSON.stringify(projectDataObj, null, 2),
      encoding: "utf-8",
    });
    treeUpdates.push({
      path: `projects/${projectName}/projectData.json`,
      mode: "100644",
      sha: projectDataBlob.sha,
    });

    // Update cogsIndex.json
    indexCog.project = projectName;
    indexCog.path = newPath;
    const { data: newIndexBlob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: JSON.stringify(indexObj, null, 2),
      encoding: "utf-8",
    });
    treeUpdates.push({
      path: "cogsIndex.json",
      mode: "100644",
      sha: newIndexBlob.sha,
    });

    // 5. Commit
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeUpdates,
    });

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Create project '${projectName}' and move cog '${cogId}'`,
      tree: newTree.sha,
      parents: [baseCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
    });

    revalidatePath(`/myCogs/${cogId}/editCog`);
    revalidatePath(`/myCogs/${cogId}/viewCog`);

    return { success: true };
  } catch (error) {
    console.error("Structural operation failed", error);
    if (error && typeof error === "object" && "status" in error && typeof error.status === "number" && [502, 503, 504].includes(error.status)) {
      return { success: false, error: "GitHub is temporarily unavailable. Please try again." };
    }
    return { success: false, error: "Failed to create project and move cog" };
  }
}

export async function getCogHistory(cogId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    return { success: false, error: "Cogmit repository is not ready" };
  }

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  try {
    const cogPath = await resolveRootCogPath(owner, repo, cogId);
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path: `${cogPath}/rootCog.md`,
      per_page: 30,
    });
    
    const history = commits.map(c => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message,
      date: c.commit.author?.date || c.commit.committer?.date || "",
      authorName: c.commit.author?.name || "Unknown",
      authorLogin: c.author?.login,
      authorAvatarUrl: c.author?.avatar_url,
      htmlUrl: c.html_url
    }));

    return { success: true, history };
  } catch (error) {
    console.error("Failed to fetch cog history", error);
    return { success: false, error: "Failed to load history." };
  }
}

export async function moveCogToDestination(
  cogId: string,
  destProjectName: string,
  isNew: boolean
) {
  const session = await auth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (isNew && destProjectName !== "No Parent Project") {
    const parts = destProjectName.split("/");
    const newName = parts[parts.length - 1];
    if (!newName || newName.trim().length === 0) {
      return { success: false, error: "Project name is required" };
    }
    if (newName.length > 57) {
      return { success: false, error: "Project name must be 57 characters or less" };
    }
  }

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    return { success: false, error: "Cogmit repository is not ready" };
  }

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  try {
    const defaultBranch = await getDefaultBranch(owner, repo);
    
    // 1. Get current index and find cog
    let indexObj = { cogs: [] as { id: string, title?: string, path?: string, project?: string, cogmitPublished?: string, cogmitId?: string, slug?: string }[] };
    let indexData;
    try {
      const res = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "cogsIndex.json",
      });
      indexData = res.data;
    } catch {
      return { success: false, error: "cogsIndex.json could not be read." };
    }
    
    if (indexData && !Array.isArray(indexData) && "content" in indexData) {
      const contentStr = Buffer.from(indexData.content, "base64").toString("utf-8");
      indexObj = JSON.parse(contentStr);
    } else {
      return { success: false, error: "cogsIndex.json missing or invalid" };
    }

    const indexCog = indexObj.cogs?.find((c) => c.id === cogId);
    if (!indexCog) {
      return { success: false, error: "Unable to move because the current Cog could not be located in GitHub." };
    }

    let oldPath;
    try {
      oldPath = await resolveRootCogPath(owner, repo, cogId);
    } catch {
      return { success: false, error: "Unable to move because the current Cog could not be located in GitHub." };
    }

    const newPath = destProjectName === "No Parent Project" ? `NPPCogs/${cogId}` : `projects/${destProjectName}/${cogId}`;

    if (oldPath === newPath) {
      return { success: true }; // Already there
    }

    // 2. Fetch old cog files to move them
    let oldFiles: { name: string, type: string, sha: string }[] = [];
    try {
      const { data: dirData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: oldPath,
      });
      if (Array.isArray(dirData)) {
        oldFiles = dirData;
      } else {
        return { success: false, error: "Current RootCog path mismatch (not a directory)" };
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 404) {
        return { success: false, error: "RootCog no longer exists at old path" };
      }
      throw e;
    }

    // 3. Ensure target cog doesn't exist
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: newPath,
      });
      return { success: false, error: "Target RootCog already exists at destination" };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    // 4. If isNew, ensure project doesn't exist
    if (isNew && destProjectName !== "No Parent Project") {
      try {
        await octokit.rest.repos.getContent({
          owner,
          repo,
          path: `projects/${destProjectName}/projectData.json`,
        });
        return { success: false, error: "Project already exists" };
      } catch (e) {
        if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
      }
    }

    // 5. Create blobs and tree
    let baseCommitSha;
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      baseCommitSha = refData.object.sha;
    } catch {
      return { success: false, error: "Unable to move because the repository branch could not be resolved." };
    }
    
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    const treeUpdates: { path: string, mode: "100644" | "100755" | "040000" | "160000" | "120000", sha: string | null }[] = [];

    // Delete old files, create new files pointing to same blobs
    for (const file of oldFiles) {
      if (file.type === "file") {
        treeUpdates.push({
          path: `${oldPath}/${file.name}`,
          mode: "100644",
          sha: null, // delete
        });
        
        const newFileContentSha = file.sha;
        

        
        treeUpdates.push({
          path: `${newPath}/${file.name}`,
          mode: "100644",
          sha: newFileContentSha, // copy blob
        });
      }
    }

    // If isNew, Create projectData.json
    if (isNew && destProjectName !== "No Parent Project") {
      const projectDataObj = {
        name: destProjectName,
        createdAt: new Date().toISOString()
      };
      const { data: projectDataBlob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: JSON.stringify(projectDataObj, null, 2),
        encoding: "utf-8",
      });
      treeUpdates.push({
        path: `projects/${destProjectName}/projectData.json`,
        mode: "100644",
        sha: projectDataBlob.sha,
      });
    }

    // Update cogsIndex.json
    indexCog.project = destProjectName;
    indexCog.path = newPath;
    const { data: newIndexBlob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: JSON.stringify(indexObj, null, 2),
      encoding: "utf-8",
    });
    treeUpdates.push({
      path: "cogsIndex.json",
      mode: "100644",
      sha: newIndexBlob.sha,
    });

    // 6. Commit
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeUpdates,
    });

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Move cog '${cogId}' to '${destProjectName}'`,
      tree: newTree.sha,
      parents: [baseCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
    });

    revalidatePath(`/myCogs/${cogId}/editCog`);
    revalidatePath(`/myCogs/${cogId}/viewCog`);

    return { success: true };
  } catch (error) {
    console.error("Structural operation failed", error);
    if (error && typeof error === "object" && "status" in error && typeof error.status === "number" && [502, 503, 504].includes(error.status)) {
      return { success: false, error: "GitHub is temporarily unavailable. Please try again." };
    }
    return { success: false, error: "Failed to move cog" };
  }
}

