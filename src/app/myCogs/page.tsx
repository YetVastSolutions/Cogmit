import { auth } from "@/auth";
import { getCogmitDataStatus, getOctokit } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MetadataMarquee } from "@/components/MetadataMarquee";

type CogIndexEntry = {
  id: string;
  title: string;
  path: string;
  project?: string;
  deletedAt?: string;
  cogmitPublished?: string;
};

type CogWithDetails = CogIndexEntry & {
  createdAt: string | null;
  modifiedAt: string | null;
  published: boolean;
};

export default async function MyCogsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  function formatDateString(isoString: string | null | undefined) {
    if (!isoString) return "Unknown";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Unknown";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  }

  const status = await getCogmitDataStatus();

  if (status.state === "repo_missing") {
    return (
      <div className="flex flex-col items-center pt-16 px-4 pb-8 sm:px-8 bg-background flex-1 w-full max-w-[var(--page-content-max-width)] mx-auto">
        <main className="flex flex-col items-center gap-12 max-w-2xl text-center w-full">
          <div className="border border-yellow-600/30 p-6 rounded-lg bg-yellow-500/5">
            <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
              Repository not found
            </h2>
            <p className="text-muted-foreground mb-4">
              Your Cogmit data repository could not be found. It may have been deleted.
            </p>
            <Link href="/">
              <Button>Configure Repository</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (status.state === "repo_invalid") {
    return (
      <div className="flex flex-col items-center pt-16 px-4 pb-8 sm:px-8 bg-background flex-1 w-full max-w-[var(--page-content-max-width)] mx-auto">
        <main className="flex flex-col items-center gap-12 max-w-2xl text-center w-full">
          <div className="border border-red-600/30 p-6 rounded-lg bg-red-500/5">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              This is not a Cogmit repo
            </h2>
            <p className="text-muted-foreground mb-4">
              Your configured repository does not contain the expected Cogmit structure.
            </p>
            <Link href="/">
              <Button>Configure Repository</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (status.state === "ready" && status.isEmpty) {
    return (
      <div className="flex flex-col items-center pt-16 px-4 pb-8 sm:px-8 bg-background flex-1 w-full max-w-[var(--page-content-max-width)] mx-auto">
        <main className="flex flex-col items-center gap-12 max-w-2xl text-center w-full">
          <div className="w-full border border-green-600/30 rounded-lg p-6 bg-green-500/5">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
              Your Cogmit workspace is ready
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              Your Cogmit data repository is connected and initialized.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              You haven&apos;t created a Cog yet.
            </p>
            <Link href="/myCogs/new/editCog" className="inline-flex w-full">
              <Button className="w-full">Create your first Cog</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  let indexObj: { cogs: CogIndexEntry[] } = { cogs: [] };
  let cogsWithDetails: CogWithDetails[] = [];
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

      const activeCogs = indexObj.cogs.filter((cog: CogIndexEntry) => !cog.deletedAt);
      cogsWithDetails = await Promise.all(
        activeCogs.map(async (cog: CogIndexEntry) => {
          let createdAt = null;
          let modifiedAt = null;
          const published = false; // Implementation gap: publication state does not exist in data model

          try {
            // Fetch commits for this Cog path to get GitHub-derived timestamps
            const commitsData = await octokit.rest.repos.listCommits({
              owner: status.owner,
              repo: status.repo,
              path: cog.path,
            });

            if (commitsData.data && commitsData.data.length > 0) {
              // First commit in the list is the most recent (modified)
              modifiedAt = commitsData.data[0].commit.committer?.date || null;
              // Last commit in the list is the oldest (created)
              createdAt = commitsData.data[commitsData.data.length - 1].commit.committer?.date || null;
            }
          } catch {
            // Ignore fetch errors for individual cogs
          }
          return { ...cog, createdAt, modifiedAt, published };
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
          <h1 className="text-3xl font-bold text-primary">My Cogs</h1>
          <p className="text-muted-foreground">Your private Cog workspace</p>
        </div>
        <Link href="/myCogs/new/editCog">
          <Button>+ Create Cog</Button>
        </Link>
      </header>

      <main>
        {cogsWithDetails && cogsWithDetails.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {cogsWithDetails.map((cog: CogWithDetails) => (
              <div key={cog.id} className="relative group">
                <Link href={`/myCogs/${cog.id}/viewCog`} className="min-w-0 block h-full">
                  <div className="border border-border p-6 rounded-xl bg-card hover:border-yellow-500 transition-colors h-full flex flex-col gap-3 min-w-0">
                    {/* ROW 1 */}
                    <h3 className="text-xl font-semibold text-foreground truncate pr-12">
                      {cog.title || "Untitled RootCog"}
                    </h3>

                    <div className="mt-auto flex flex-col min-w-0 w-full text-sm text-muted-foreground font-medium">
                      <MetadataMarquee 
                        layout="static-above"
                        staticItems={[
                          <span key="1" className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium text-black ${cog.cogmitPublished ? "bg-yellow-400" : "bg-green-500"}`}>
                            {cog.cogmitPublished ? "Published" : "Not published"}
                          </span>,
                          <span key="2">{cog.project || "NPPCog"}</span>
                        ]}
                        items={[
                          cog.cogmitPublished ? (
                            <span key="3">Latest Cogmit published: {new Date(cog.cogmitPublished).toLocaleString()}</span>
                          ) : null,
                          <span key="4">Modified: {formatDateString(cog.modifiedAt)}</span>,
                          <span key="5">Created: {formatDateString(cog.createdAt)}</span>
                        ].filter(Boolean)} 
                      />
                    </div>
                  </div>
                </Link>
                <Link href={`/myCogs/${cog.id}/editCog`} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            No active RootCogs found in your index.
          </p>
        )}
      </main>
    </div>
  );
}
