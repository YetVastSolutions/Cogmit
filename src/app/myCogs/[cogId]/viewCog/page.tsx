import { auth } from "@/auth";
import { getRepositoryContent, getOctokit, getCogmitDataStatus, resolveRootCogPath, getProjects } from "@/lib/github";
import { moveCogToDestination } from "@/app/myCogs/[cogId]/editCog/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ViewCog } from "@/components/ViewCog";

export default async function ViewCogPage({ params }: { params: Promise<{ cogId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { cogId } = await params;
  const decodedCogId = decodeURIComponent(cogId);

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    redirect("/myCogs");
  }

  const { owner, repo } = status;

  let cogPath = "";

  try {
    cogPath = await resolveRootCogPath(owner, repo, decodedCogId);
  } catch (error) {
    console.error("Failed to read cogsIndex.json", error);
  }

  if (!cogPath) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">RootCog Not Found</h1>
        <p className="text-muted-foreground mb-8">The Cog &quot;{decodedCogId}&quot; could not be found in your index.</p>
        <Link href="/myCogs" className={buttonVariants()}>
          Back to My Cogs
        </Link>
      </div>
    );
  }

  let content = "";
  let rootCogInfo: any = {};

  try {
    const fileData = await getRepositoryContent(owner, repo, `${cogPath}/rootCog.md`);
    if (fileData && !Array.isArray(fileData) && "content" in fileData) {
      content = Buffer.from(fileData.content, "base64").toString("utf8");
    }

    const infoData = await getRepositoryContent(owner, repo, `${cogPath}/rootCogInfo.json`);
    if (infoData && !Array.isArray(infoData) && "content" in infoData) {
      rootCogInfo = JSON.parse(Buffer.from(infoData.content, "base64").toString("utf8"));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error && typeof error === "object" && "name" in error && "AuthenticationRequiredError" === error.name) {
      redirect("/login");
    }
    console.error("Failed to load cog content", error);
  }

  let createdAt = rootCogInfo.createdAt || "";
  let lastModified = rootCogInfo.updatedAt || "";

  try {
    const octokit = await getOctokit();
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path: cogPath,
      per_page: 100,
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

  const projectValue = rootCogInfo.project || "No Parent Project";
  const title = rootCogInfo.title || decodedCogId;

  const projects = await getProjects();

  const handleMoveProject = async (destProjectName: string, isNew: boolean) => {
    "use server";
    return moveCogToDestination(decodedCogId, destProjectName, isNew);
  };

  return (
    <ViewCog
      title={title}
      project={projectValue}
      content={content}
      createdAt={createdAt}
      lastModified={lastModified}
      editUrl={`/myCogs/${decodedCogId}/editCog`}
      showPublish={true}
      deleteCogId={decodedCogId}
      cogId={decodedCogId}
      projects={projects}
      onMoveProject={handleMoveProject}
    />
  );
}
