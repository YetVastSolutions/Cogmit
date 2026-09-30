import { getAnonymousOctokit } from "@/lib/github";
import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import { ViewCog } from "@/components/ViewCog";

export default async function CogmitPage({ params }: { params: Promise<{ authorId: string; cogmitId: string; slug: string }> }) {
  const { authorId, cogmitId, slug } = await params;
  const decodedAuthorId = decodeURIComponent(authorId);
  const decodedCogmitId = decodeURIComponent(cogmitId);
  const repoName = "YVSApps_Cogmit_Data";

  const session = await auth().catch(() => null);
  let octokit: Octokit;
  let hasGithubToken = false;
  
  try {
    octokit = await getAnonymousOctokit();
    hasGithubToken = true;
  } catch (error) {
    if (error instanceof Error && error.name === "ServiceTokenMissingError") {
      return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
          <h1 className="text-3xl font-bold text-destructive mb-4">Server Configuration Error</h1>
          <p className="text-muted-foreground">The server is missing the required GITHUB_SERVICE_TOKEN to serve public Cogmits.</p>
        </div>
      );
    }
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return (
        <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
          <h1 className="text-3xl font-bold text-destructive mb-4">GitHub Authentication Failed</h1>
          <p className="text-muted-foreground">The server&apos;s service token could not authenticate with GitHub.</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Internal Error</h1>
        <p className="text-muted-foreground">An error occurred while initializing GitHub access.</p>
      </div>
    );
  }

  let defaultBranch = "";
  
  // 1. Resolve repository metadata
  try {
    const repoInfo = await octokit.rest.repos.get({
      owner: decodedAuthorId,
      repo: repoName,
    });
    defaultBranch = repoInfo.data.default_branch;
  } catch (error) {
    console.error("GitHub repository access diagnostic", {
      owner: decodedAuthorId,
      repo: repoName,
      hasGithubToken: hasGithubToken,
      authenticationSource: "existing application GitHub auth",
      errorStatus: (error as { status?: number })?.status,
      errorMessage: error instanceof Error ? error.message : undefined,
    });
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Found</h1>
      </div>
    );
  }

  // 2. Fetch cogsIndex.json
  let publicIndexObj = { cogs: [] as { id: string, path?: string, project?: string, title?: string, cogmitId?: string, slug?: string, cogmitPublished?: string }[] };
  try {
    console.log("Diagnostic Log:", {
      authorId: decodedAuthorId,
      repoName,
      branchRef: defaultBranch,
      indexPath: "cogsIndex.json"
    });

    const { data } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: repoName,
      path: "cogsIndex.json",
      ref: defaultBranch,
    });

    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      publicIndexObj = JSON.parse(contentStr);
    } else {
      throw new Error("Invalid content format");
    }
  } catch (error) {
    console.error("Diagnostic Log: Index read failed", { error: error instanceof Error ? error.message : String(error) });
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Index Error</h1>
        <p className="text-muted-foreground">The author&apos;s Cogmit index could not be read.</p>
      </div>
    );
  }

  // 3. Find requested Cogmit
  let cogPath = "";
  let project = "";
  let title = decodedCogmitId;

  const cogInfo = publicIndexObj.cogs?.find(
    (c) => c.cogmitId === decodedCogmitId && c.cogmitPublished && c.slug === slug
  );
  if (cogInfo && cogInfo.path) {
    cogPath = cogInfo.path;
    project = cogInfo.project || "No Parent Project";
    title = cogInfo.title || decodedCogmitId;
  }

  if (!cogPath) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Cogmit Not Found</h1>
        <p className="text-muted-foreground">The Cogmit could not be found in the published index.</p>
      </div>
    );
  }

  let content = "";

  try {
    const { data: mdData } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: repoName,
      path: `${cogPath}/rootCog.md`,
      ref: defaultBranch,
    });
    if (mdData && !Array.isArray(mdData) && "content" in mdData) {
      content = Buffer.from(mdData.content, "base64").toString("utf8");
    }


  } catch (error) {
    console.error("Failed to load public cogmit content", error);
  }

  // TODO: we can configure NEXT_PUBLIC_BASE_URL or just use a relative string for the share URL if needed
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://cogmit.yvs.app/cogmits/${decodedAuthorId}/${decodedCogmitId}/${slug}`;

  const currentUsername = session?.user?.name || (session?.user as { login?: string })?.login || "";
  const isAuthor = currentUsername === decodedAuthorId;

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
      <ViewCog
        title={title}
        project={project}
        content={content}
        mode="cogmit"
        authorId={decodedAuthorId}
        cogmitId={decodedCogmitId}
        shareUrl={shareUrl}
        isAuthor={isAuthor}
      />
    </div>
  );
}
