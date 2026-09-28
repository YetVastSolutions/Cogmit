import { auth } from "@/auth";
import { listUserRepositories } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // Reuse the shared repository listing service
  let repos: Awaited<ReturnType<typeof listUserRepositories>> = [];
  try {
    repos = await listUserRepositories();
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to fetch repos", error);
  }

  return (
    <div className="flex min-h-screen flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Select a repository to use as your Cogmit</p>
        </div>
        <Link 
          href="/"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Home
        </Link>
      </header>
      
      <main className="flex flex-col gap-4">
        {repos.length === 0 ? (
          <p className="text-muted-foreground">No repositories found or failed to load.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <div key={repo.id} className="border border-border p-4 rounded-lg hover:border-primary transition-colors">
                <h2 className="font-semibold text-lg truncate">{repo.name}</h2>
                <p className="text-sm text-muted-foreground truncate">{repo.description || "No description"}</p>
                <div className="mt-4 flex gap-2">
                  <Link 
                    href={`/repo/${repo.owner.login}/${repo.name}`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}
                  >
                    Connect as Cogmit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
