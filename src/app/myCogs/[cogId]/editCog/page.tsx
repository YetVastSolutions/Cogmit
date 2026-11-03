import { auth } from "@/auth";
import { getRepositoryContent, getOctokit, getCogmitDataStatus, getProjects, getRootCogIndexEntry, CogIndexEntry } from "@/lib/github";
import { redirect } from "next/navigation";
import {
  ROUTE_LOGIN,
  ROUTE_MY_COGS,
  FILE_ROOT_COG_MD,
  DEFAULT_COMMITS_PER_PAGE,
  NO_PARENT_PROJECT,
} from "@/constants";
import { EditCogClient } from "./EditCogClient";

export default async function EditCogPage({ params }: { params: Promise<{ cogId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect(ROUTE_LOGIN);
  }

  const { cogId } = await params;
  const decodedCogId = decodeURIComponent(cogId);

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    redirect(ROUTE_MY_COGS);
  }

  const { owner, repo } = status;
  
  let cogPath = "";
  let cogIndexEntry: CogIndexEntry | undefined = undefined;
  
  try {
    cogIndexEntry = await getRootCogIndexEntry(owner, repo, decodedCogId);
    cogPath = cogIndexEntry.path;
  } catch (error) {
    console.error("Failed to read cogsIndex.json", error);
  }

  if (!cogPath) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">RootCog Not Found</h1>
        <p className="text-muted-foreground">The Cog &quot;{decodedCogId}&quot; could not be found in your index.</p>
      </div>
    );
  }

  let content = "";
  
  try {
    const fileData = await getRepositoryContent(owner, repo, `${cogPath}/${FILE_ROOT_COG_MD}`);
    if (fileData && !Array.isArray(fileData) && typeof fileData === "object" && "content" in fileData && typeof fileData.content === "string") {
      content = Buffer.from(fileData.content, "base64").toString("utf8");
    }
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && "AuthenticationRequiredError" === error.name) {
      redirect(ROUTE_LOGIN);
    }
    console.error("Failed to load cog content", error);
  }

  let createdAt = "";
  let lastModified = "";

  try {
    const octokit = await getOctokit();
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path: cogPath,
      per_page: DEFAULT_COMMITS_PER_PAGE,
    });
    if (commits && commits.length > 0) {
      if (!lastModified) {
        lastModified = commits[0].commit.committer?.date || commits[0].commit.author?.date || "";
      }
      if (!createdAt) {
        createdAt = commits[commits.length - 1].commit.committer?.date || commits[commits.length - 1].commit.author?.date || "";
      }
    }
  } catch (error) {
    console.error("Failed to fetch commit history for timestamps", error);
  }

  const projects = await getProjects();

  return (
    <EditCogClient 
      mode="existing"
      cogId={decodedCogId}
      initialTitle={cogIndexEntry?.title || decodedCogId}
      initialProject={cogIndexEntry?.project || NO_PARENT_PROJECT}
      initialContent={content}
      projects={projects}
      createdAt={createdAt}
      lastModified={lastModified}
      published={cogIndexEntry?.cogmitPublished}
    />
  );
}
