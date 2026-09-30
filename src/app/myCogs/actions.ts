"use server";

import { auth } from "@/auth";
import { getCogmitDataStatus, getOctokit, getDefaultBranch } from "@/lib/github";
import { revalidatePath } from "next/cache";

export async function deleteRootCog(cogId: string) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return { success: false, error: "Cogmit repository is not ready" };

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  try {
    const defaultBranch = await getDefaultBranch(owner, repo);
    
    const res = await octokit.rest.repos.getContent({ owner, repo, path: "cogsIndex.json" });
    const indexData = res.data;
    if (!indexData || Array.isArray(indexData) || !("content" in indexData)) {
      return { success: false, error: "cogsIndex.json missing or invalid" };
    }

    const indexObj = JSON.parse(Buffer.from(indexData.content, "base64").toString("utf-8"));
    const indexCog = indexObj.cogs?.find((c: { id: string, path: string, deletedAt?: string }) => c.id === cogId);

    if (!indexCog) return { success: false, error: "Cog not found in index" };
    if (indexCog.deletedAt) return { success: false, error: "Cog is already deleted" };

    const oldPath = indexCog.path;
    const newPath = `deletedCogs/${cogId}`;

    try {
      await octokit.rest.repos.getContent({ owner, repo, path: newPath });
      return { success: false, error: "Target deleted path already exists" };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    const { data: dirData } = await octokit.rest.repos.getContent({ owner, repo, path: oldPath });
    if (!Array.isArray(dirData)) return { success: false, error: "Current RootCog path is not a directory" };

    const { data: refData } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    const baseCommitSha = refData.object.sha;
    const { data: commitData } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
    const baseTreeSha = commitData.tree.sha;

    const treeUpdates: { path?: string; mode?: "100644" | "100755" | "040000" | "160000" | "120000"; type?: "blob" | "tree" | "commit"; sha?: string | null; content?: string }[] = [];
    for (const file of dirData) {
      if (file.type === "file") {
        treeUpdates.push({ path: `${oldPath}/${file.name}`, mode: "100644", sha: null });
        treeUpdates.push({ path: `${newPath}/${file.name}`, mode: "100644", sha: file.sha });
      }
    }

    indexCog.deletedAt = new Date().toISOString();
    
    const { data: newIndexBlob } = await octokit.rest.git.createBlob({
      owner, repo, content: JSON.stringify(indexObj, null, 2), encoding: "utf-8",
    });
    treeUpdates.push({ path: "cogsIndex.json", mode: "100644", sha: newIndexBlob.sha });



    const { data: newTree } = await octokit.rest.git.createTree({
      owner, repo, base_tree: baseTreeSha, tree: treeUpdates,
    });
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo, message: `Delete cog '${cogId}'`, tree: newTree.sha, parents: [baseCommitSha],
    });
    await octokit.rest.git.updateRef({
      owner, repo, ref: `heads/${defaultBranch}`, sha: newCommit.sha,
    });

    revalidatePath("/myCogs");
    revalidatePath("/myCogs/deletedCogs");
    return { success: true };
  } catch (error) {
    console.error("Delete failed", error);
    return { success: false, error: "Failed to delete cog" };
  }
}

export async function restoreRootCog(cogId: string) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") return { success: false, error: "Cogmit repository is not ready" };

  const octokit = await getOctokit();
  const owner = status.owner;
  const repo = status.repo;

  try {
    const defaultBranch = await getDefaultBranch(owner, repo);
    
    const res = await octokit.rest.repos.getContent({ owner, repo, path: "cogsIndex.json" });
    const indexData = res.data;
    if (!indexData || Array.isArray(indexData) || !("content" in indexData)) {
      return { success: false, error: "cogsIndex.json missing or invalid" };
    }

    const indexObj = JSON.parse(Buffer.from(indexData.content, "base64").toString("utf-8"));
    const indexCog = indexObj.cogs?.find((c: { id: string, path: string, deletedAt?: string }) => c.id === cogId);

    if (!indexCog) return { success: false, error: "Cog not found in index" };
    if (!indexCog.deletedAt) return { success: false, error: "Cog is not deleted" };

    const originalPath = indexCog.path;
    const oldPath = `deletedCogs/${cogId}`;

    try {
      await octokit.rest.repos.getContent({ owner, repo, path: originalPath });
      return { success: false, error: "Cannot restore: Target path already exists" };
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status !== 404) throw e;
    }

    const { data: dirData } = await octokit.rest.repos.getContent({ owner, repo, path: oldPath });
    if (!Array.isArray(dirData)) return { success: false, error: "Deleted RootCog path is not a directory" };

    const { data: refData } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    const baseCommitSha = refData.object.sha;
    const { data: commitData } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
    const baseTreeSha = commitData.tree.sha;

    const treeUpdates: { path?: string; mode?: "100644" | "100755" | "040000" | "160000" | "120000"; type?: "blob" | "tree" | "commit"; sha?: string | null; content?: string }[] = [];
    for (const file of dirData) {
      if (file.type === "file") {
        treeUpdates.push({ path: `${oldPath}/${file.name}`, mode: "100644", sha: null });
        treeUpdates.push({ path: `${originalPath}/${file.name}`, mode: "100644", sha: file.sha });
      }
    }

    delete indexCog.deletedAt;
    
    const { data: newIndexBlob } = await octokit.rest.git.createBlob({
      owner, repo, content: JSON.stringify(indexObj, null, 2), encoding: "utf-8",
    });
    treeUpdates.push({ path: "cogsIndex.json", mode: "100644", sha: newIndexBlob.sha });

    const { data: newTree } = await octokit.rest.git.createTree({
      owner, repo, base_tree: baseTreeSha, tree: treeUpdates,
    });
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo, message: `Restore cog '${cogId}'`, tree: newTree.sha, parents: [baseCommitSha],
    });
    await octokit.rest.git.updateRef({
      owner, repo, ref: `heads/${defaultBranch}`, sha: newCommit.sha,
    });

    revalidatePath("/myCogs");
    revalidatePath("/myCogs/deletedCogs");
    return { success: true };
  } catch (error) {
    console.error("Restore failed", error);
    return { success: false, error: "Failed to restore cog" };
  }
}
