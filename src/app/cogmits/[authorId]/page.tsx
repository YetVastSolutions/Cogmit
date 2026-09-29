import { getOctokit } from "@/lib/github";
import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import Link from "next/link";

export default async function AuthorCogmitsPage({ params }: { params: Promise<{ authorId: string }> }) {
  const { authorId } = await params;
  const decodedAuthorId = decodeURIComponent(authorId);
  const repoName = "YVSApps_Cogmit_Data";

  let octokit: Octokit;
  let hasGithubToken = false;
  try {
    octokit = await getOctokit();
    hasGithubToken = true;
  } catch (error: any) {
    if (error.name === "AuthenticationRequiredError") {
      return (
        <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
          <h1 className="text-3xl font-bold text-destructive mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">You must be logged in to view Cogmits.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
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
  } catch (error: any) {
    console.error("GitHub repository access diagnostic", {
      owner: decodedAuthorId,
      repo: repoName,
      hasGithubToken: hasGithubToken,
      authenticationSource: "existing application GitHub auth",
      errorStatus: error?.status,
      errorMessage: error?.message,
    });
    return (
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Found</h1>
      </div>
    );
  }

  // 2. Fetch cogmitsIndex.json
  let publicIndexObj = { cogs: [] as any[] };
  try {
    console.log("Diagnostic Log:", {
      authorId: decodedAuthorId,
      repoName,
      branchRef: defaultBranch,
      indexPath: "cogmitsIndex.json"
    });

    const { data } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: repoName,
      path: "cogmitsIndex.json",
      ref: defaultBranch,
    });

    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      publicIndexObj = JSON.parse(contentStr);
    } else {
      throw new Error("Invalid content format");
    }
  } catch (error: any) {
    console.error("Diagnostic Log: Index read failed", { error: error?.message || error });
    return (
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Index Error</h1>
        <p className="text-muted-foreground">The author's Cogmit index could not be read.</p>
      </div>
    );
  }

  const cogmits = publicIndexObj.cogs || [];

  return (
    <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
      <h1 className="text-3xl font-bold text-primary mb-8">
        Cogmits by {decodedAuthorId}
      </h1>

      {cogmits.length === 0 ? (
        <div className="text-muted-foreground">
          No published Cogmits found for this author.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cogmits.map((cogmit) => {
            const slug = encodeURIComponent(
              (cogmit.title || cogmit.id)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
            );
            return (
              <Link 
                key={cogmit.id} 
                href={`/cogmits/${decodedAuthorId}/${cogmit.id}/${slug}`}
                className="flex flex-col p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card"
              >
                <h2 className="text-xl font-semibold mb-2 line-clamp-2" title={cogmit.title}>
                  {cogmit.title}
                </h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {cogmit.project || "No Parent Project"}
                </div>
                <div className="mt-auto text-xs text-muted-foreground/70">
                  {cogmit.publishedAt ? new Date(cogmit.publishedAt).toLocaleDateString() : "Unknown date"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
