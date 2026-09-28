import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { ConnectRepoFlow } from "@/components/ConnectRepoFlow";
import { listUserRepositories } from "@/lib/github";
import { handleConnectRepository, handleInitiateCogmitData } from "@/lib/cogmit-actions";
import type { RepoListItem } from "@/lib/cogmit-actions";

export default async function ConnectPage() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  let repos: RepoListItem[] = [];
  try {
    const rawRepos = await listUserRepositories();
    repos = rawRepos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      owner_login: r.owner.login,
      private: r.private,
      updated_at: r.updated_at,
    }));
  } catch (error) {
    console.error("Failed to fetch repos:", error);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Connect Repository</h1>
          <p className="text-muted-foreground">
            Select an existing repository that contains your Cogmit data
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Home
        </Link>
      </header>

      <main>
        <ConnectRepoFlow
          initialRepos={repos}
          connectAction={handleConnectRepository}
          initiateCogmitDataAction={handleInitiateCogmitData}
        />
      </main>
    </div>
  );
}
