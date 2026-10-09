import { Octokit } from "@octokit/rest";

import Link from "next/link";
import { formatTimestamp } from "@/lib/utils";

export default async function AuthorCogmitsPage({ params }: { params: Promise<{ authorId: string }> }) {
  const { authorId } = await params;
  const decodedAuthorId = decodeURIComponent(authorId);
  const repoName = "YVSApps_Cogmit_Data";

  let octokit: Octokit;
  try {
    octokit = new Octokit();
  } catch {
    return (
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
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
      repo: "YVSApps_Data_Cogmit_Public",
    });
    defaultBranch = repoInfo.data.default_branch;
    targetRepo = "YVSApps_Data_Cogmit_Public";
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
        repo: "YVSApps_Data_Cogmit_Public",
        errorStatus: (error as { status?: number })?.status,
      });
    }
  }

  if (!targetRepo) {
    return (
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Found</h1>
      </div>
    );
  }

  // 2. Fetch cogmitsIndex.json
  let publicIndexObj = { cogmits: [] as { cogmitId?: string, id?: string, title?: string, path?: string, slug?: string, publishedAt?: string }[] };
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
      <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto p-8">
        <h1 className="text-3xl font-bold text-destructive mb-4">Index Error</h1>
        <p className="text-muted-foreground">The author&apos;s Cogmit index could not be read.</p>
      </div>
    );
  }

  const cogmits = publicIndexObj.cogmits || [];

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
              (cogmit.title || cogmit.cogmitId || cogmit.id || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
            );
            const slug = cogmit.slug || fallbackSlug;
            const linkId = cogmit.cogmitId || cogmit.id;

            return (
              <Link
                key={linkId}
                href={`/cogmits/${decodedAuthorId}/${linkId}`}
                className="flex flex-col p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card"
              >
                <h2 className="text-xl font-semibold mb-2 line-clamp-2" title={cogmit.title}>
                  {cogmit.title || "Untitled"}
                </h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {/* Since cogmitsIndex doesn't store project implicitly, we omit it or change this */}
                </div>
                <div className="mt-auto text-xs text-muted-foreground/70">
                  {formatTimestamp(cogmit.publishedAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
