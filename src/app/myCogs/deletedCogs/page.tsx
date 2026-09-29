import { auth } from "@/auth";
import { getOctokit, getCogmitDataStatus } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CogMetadataRow } from "@/components/CogMetadataRow";
import { RestoreCogButton } from "@/components/RestoreCogButton";

function formatDateString(dateStr: string | null) {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return dateStr;
  }
}

export default async function DeletedCogsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const status = await getCogmitDataStatus();
  if (status.state === "repo_missing" || status.state === "repo_invalid") {
    redirect("/dashboard/connect");
  }

  if (status.state !== "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Repository Not Ready</h1>
        <p className="text-muted-foreground mb-8">
          The Cogmit data repository is currently unreachable or invalid.
        </p>
      </div>
    );
  }

  let indexObj = { cogs: [] };
  let cogsWithDetails: any[] = [];
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: status.owner,
      repo: status.repo,
      path: "cogsIndex.json",
    });
    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      indexObj = JSON.parse(contentStr);

      const deletedCogs = indexObj.cogs.filter((cog: any) => cog.deletedAt);
      cogsWithDetails = await Promise.all(
        deletedCogs.map(async (cog: any) => {
          let createdAt = null;
          let modifiedAt = null;
          
          try {
            // Fetch commits for this Cog path (deletedCogs/cogId) to get timestamps
            const commitsData = await octokit.rest.repos.listCommits({
              owner: status.owner,
              repo: status.repo,
              path: `deletedCogs/${cog.id}`,
            });
            
            if (commitsData.data && commitsData.data.length > 0) {
              modifiedAt = commitsData.data[0].commit.committer?.date || null;
              createdAt = commitsData.data[commitsData.data.length - 1].commit.committer?.date || null;
            }
          } catch (e) {
            // Ignore fetch errors
          }
          return { ...cog, createdAt, modifiedAt };
        })
      );
    }
  } catch (err) {
    console.error("Failed to read cogsIndex.json", err);
  }

  return (
    <div className="flex flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Deleted Cogs</h1>
          <p className="text-muted-foreground">Cogs that have been moved to deletedCogs</p>
        </div>
        <Link href="/myCogs">
          <Button variant="outline">Back to My Cogs</Button>
        </Link>
      </header>

      <main>
        {cogsWithDetails && cogsWithDetails.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {cogsWithDetails.map((cog: any) => (
              <div key={cog.id} className="relative group">
                <div className="border border-border p-6 rounded-xl bg-card transition-colors h-full flex flex-col gap-3 min-w-0 overflow-hidden opacity-80">
                  <h3 className="text-xl font-semibold text-foreground truncate pr-12">
                    {cog.title || "Untitled RootCog"}
                  </h3>
                  
                  <div className="mt-auto flex flex-col gap-2 min-w-0">
                    <CogMetadataRow className="text-sm text-muted-foreground font-medium">
                      <span>Deleted: {formatDateString(cog.deletedAt)}</span>
                      <span className="opacity-50">|</span>
                      <span>Project: {cog.project || "NPPCog"}</span>
                    </CogMetadataRow>
                  </div>
                </div>
                <RestoreCogButton cogId={cog.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            No deleted Cogs found.
          </p>
        )}
      </main>
    </div>
  );
}
