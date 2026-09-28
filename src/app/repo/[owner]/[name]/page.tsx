import { auth } from "@/auth";
import { validateCogmitRepository, getOctokit } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { RepoStatusView } from "./RepoStatusView";

export default async function RepoPage({ params }: { params: Promise<{ owner: string, name: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { owner, name } = await params;

  let repoExists = false;
  let isValid = false;
  try {
    const octokit = await getOctokit();
    try {
      await octokit.rest.repos.get({ owner, repo: name });
      repoExists = true;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    if (repoExists) {
      isValid = await validateCogmitRepository(owner, name);
    }
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to validate repo", error);
  }

  return (
    <div className="flex min-h-screen flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{owner}/{name}</h1>
          <p className="text-muted-foreground">Cogmit Repository Status</p>
        </div>
        <Link 
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Dashboard
        </Link>
      </header>
      
      <main className="flex flex-col gap-4">
        <RepoStatusView owner={owner} name={name} repoExists={repoExists} isValid={isValid} />
      </main>
    </div>
  );
}
