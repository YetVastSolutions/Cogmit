import { auth } from "@/auth";
import { getRepositoryContent } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default async function ExplorePage({ params }: { params: Promise<{ owner: string, name: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { owner, name } = await params;

  let projects: any[] = [];
  let nppCogs: any[] = [];
  try {
    const projectsData = await getRepositoryContent(owner, name, "projects");
    if (Array.isArray(projectsData)) {
      projects = projectsData.filter(item => item.type === "dir");
    }

    const nppCogsData = await getRepositoryContent(owner, name, "NPPCogs");
    if (Array.isArray(nppCogsData)) {
      nppCogs = nppCogsData.filter(item => item.type === "dir");
    }
  } catch (error) {
    console.error("Failed to load repo structure", error);
  }

  return (
    <div className="flex min-h-screen flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{name}</h1>
          <p className="text-muted-foreground">Repository Explorer</p>
        </div>
        <Link 
          href={`/repo/${owner}/${name}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Repository Settings
        </Link>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-secondary">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-muted-foreground">No projects found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li key={project.path} className="border border-border p-3 rounded-md hover:border-primary transition-colors">
                  <Link href={`/repo/${owner}/${name}/project/${encodeURIComponent(project.name)}`} className="flex items-center text-primary font-medium">
                    📁 {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-secondary">NPP Cogs</h2>
          {nppCogs.length === 0 ? (
            <p className="text-muted-foreground">No NPP Cogs found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {nppCogs.map((cog) => (
                <li key={cog.path} className="border border-border p-3 rounded-md hover:border-primary transition-colors">
                  <Link href={`/repo/${owner}/${name}/cog/${encodeURIComponent(cog.name)}`} className="flex items-center text-primary font-medium">
                    📄 {cog.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
