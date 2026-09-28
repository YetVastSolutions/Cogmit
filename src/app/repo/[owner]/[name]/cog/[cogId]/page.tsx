import { auth } from "@/auth";
import { getRepositoryContent, getOctokit } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { revalidatePath } from "next/cache";
import { CogEditor } from "@/components/CogEditor";

export default async function NPPCogPage({ params }: { params: Promise<{ owner: string, name: string, cogId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { owner, name, cogId } = await params;
  const decodedCogId = decodeURIComponent(cogId);
  const cogPath = `NPPCogs/${decodedCogId}`;

  let content = "";
  let sha = "";
  
  try {
    const fileData = await getRepositoryContent(owner, name, `${cogPath}/rootCog.md`);
    if (fileData && !Array.isArray(fileData) && "content" in fileData) {
      content = Buffer.from(fileData.content, "base64").toString("utf8");
      sha = fileData.sha;
    }
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
      redirect("/login");
    }
    console.error("Failed to load cog content", error);
  }

  const handleSave = async (newContent: string) => {
    "use server";
    try {
      const octokit = await getOctokit();
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: name,
        path: `${cogPath}/rootCog.md`,
        message: `Update ${decodedCogId} rootCog.md`,
        content: Buffer.from(newContent).toString("base64"),
        ...(sha ? { sha } : {}),
      });
      revalidatePath(`/repo/${owner}/${name}/cog/${cogId}`);
      return { success: true };
    } catch (error: any) {
      if (error && typeof error === "object" && "name" in error && error.name === "AuthenticationRequiredError") {
        redirect("/login");
      }
      console.error("Failed to save cog", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="flex min-h-screen flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Cog: {decodedCogId}</h1>
          <p className="text-muted-foreground">Editing RootCog Markdown</p>
        </div>
        <Link 
          href={`/repo/${owner}/${name}/explore`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Explorer
        </Link>
      </header>
      
      <main>
        <CogEditor initialContent={content} saveAction={handleSave} />
      </main>
    </div>
  );
}
