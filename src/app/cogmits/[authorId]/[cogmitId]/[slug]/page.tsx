import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import { ViewCog } from "@/components/ViewCog";
import { headers } from "next/headers";

export default async function CogmitPage({ params }: { params: Promise<{ authorId: string; cogmitId: string; slug: string }> }) {
  const { authorId, cogmitId, slug } = await params;
  const decodedAuthorId = decodeURIComponent(authorId);
  const decodedCogmitId = decodeURIComponent(cogmitId);
  const repoName = "YVSApps_Cogmit_Data";

  const session = await auth().catch(() => null);
  let octokit: Octokit;

  try {
    octokit = new Octokit();
  } catch {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Internal Error</h1>
        <p className="text-muted-foreground">An error occurred while initializing GitHub access.</p>
      </div>
    );
  }

  let defaultBranch = "";
  let targetRepo = "";

  // 1. Resolve repository metadata
  try {
    const repoInfo = await octokit.rest.repos.get({
      owner: decodedAuthorId,
      repo: "YVSApps_Data_Cogmits_Published",
    });
    defaultBranch = repoInfo.data.default_branch;
    targetRepo = "YVSApps_Data_Cogmits_Published";
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      try {
        const repoInfo = await octokit.rest.repos.get({
          owner: decodedAuthorId,
          repo: "YVSApps_Data_Cogmit_Public",
        });
        defaultBranch = repoInfo.data.default_branch;
        targetRepo = "YVSApps_Data_Cogmit_Public";
      } catch (innerError) {
        console.error("GitHub repository access diagnostic (Public Fallback)", {
          owner: decodedAuthorId,
          repo: "YVSApps_Data_Cogmit_Public",
          errorStatus: (innerError as { status?: number })?.status,
        });
      }
    } else {
      console.error("GitHub repository access diagnostic (Published)", {
        owner: decodedAuthorId,
        repo: "YVSApps_Data_Cogmits_Published",
        errorStatus: (error as { status?: number })?.status,
      });
    }
  }

  if (!targetRepo) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Found</h1>
      </div>
    );
  }

  // 2. Fetch cogmitsIndex.json
  let publicIndexObj = { cogmits: [] as { cogmitId?: string, id?: string, path?: string, title?: string, slug?: string }[] };
  try {
    console.log("Diagnostic Log:", {
      authorId: decodedAuthorId,
      repoName: targetRepo,
      branchRef: defaultBranch,
      indexPath: "cogmits/cogmitsIndex.json"
    });

    const { data } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: targetRepo,
      path: "cogmits/cogmitsIndex.json",
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
  let title = decodedCogmitId;

  const cogInfo = publicIndexObj.cogmits?.find(
    (c) => (c.cogmitId === decodedCogmitId || c.id === decodedCogmitId) && c.slug === slug
  );
  if (cogInfo && cogInfo.path) {
    cogPath = cogInfo.path;
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
    const { data } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: targetRepo,
      path: cogPath,
      ref: defaultBranch,
    });
    if (data && !Array.isArray(data) && "content" in data) {
      content = Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch (error) {
    console.error("Failed to load cogmit content", error);
  }
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  const shareUrl = `${protocol}://${host}/cogmits/${decodedAuthorId}/${decodedCogmitId}/${slug}`;
  const currentUsername = session?.user?.name || (session?.user as { login?: string })?.login || "";
  const isAuthor = currentUsername === decodedAuthorId;

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
      <ViewCog
        title={title}
        project={""}
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
