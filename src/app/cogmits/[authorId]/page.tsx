import { getAnonymousOctokit } from "@/lib/github";
import { Octokit } from "@octokit/rest";

import Link from "next/link";

export default async function AuthorCogmitsPage({ params }: { params: Promise<{ authorId: string }> }) {
  const { authorId } = await params;
  const decodedAuthorId = decodeURIComponent(authorId);
  const repoName = "YVSApps_Cogmit_Data";

  let octokit: Octokit;
  let hasGithubToken = false;
  try {
    octokit = await getAnonymousOctokit();
    hasGithubToken = true;
  } catch (error) {
    if (error instanceof Error && error.name === "ServiceTokenMissingError") {
      return (
        <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
          <h1 className="text-3xl font-bold text-destructive mb-4">Server Configuration Error</h1>
          <p className="text-muted-foreground">The server is missing the required GITHUB_SERVICE_TOKEN to serve public Cogmits.</p>
        </div>
      );
    }
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return (
        <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
          <h1 className="text-3xl font-bold text-destructive mb-4">GitHub Authentication Failed</h1>
          <p className="text-muted-foreground">The server&apos;s service token could not authenticate with GitHub.</p>
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
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Found</h1>
      </div>
    );
  }

  // 2. Fetch cogsIndex.json
  let publicIndexObj = { cogs: [] as { id: string, title?: string, project?: string, cogmitPublished?: string, cogmitId?: string, slug?: string }[] };
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
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Index Error</h1>
        <p className="text-muted-foreground">The author&apos;s Cogmit index could not be read.</p>
      </div>
    );
  }

  const cogmits = publicIndexObj.cogs?.filter(c => c.cogmitPublished) || [];

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
            const fallbackSlug = encodeURIComponent(
              (cogmit.title || cogmit.id)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
            );
            const slug = cogmit.slug || fallbackSlug;
            const linkId = cogmit.cogmitId || cogmit.id;
            
            return (
              <Link 
                key={linkId} 
                href={`/cogmits/${decodedAuthorId}/${linkId}/${slug}`}
                className="flex flex-col p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card"
              >
                <h2 className="text-xl font-semibold mb-2 line-clamp-2" title={cogmit.title}>
                  {cogmit.title || "Untitled"}
                </h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {cogmit.project || "No Parent Project"}
                </div>
                <div className="mt-auto text-xs text-muted-foreground/70">
                  {cogmit.cogmitPublished ? new Date(cogmit.cogmitPublished).toLocaleDateString() : "Unknown date"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
