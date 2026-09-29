import { auth } from "@/auth";
import { getRepositoryContent, getOctokit, getCogmitDataStatus, resolveRootCogPath } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2 } from "lucide-react";
import { DeleteCogButton } from "@/components/DeleteCogButton";

export default async function ViewCogPage({ params }: { params: Promise<{ cogId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { cogId } = await params;
  const decodedCogId = decodeURIComponent(cogId);

  const status = await getCogmitDataStatus();
  if (status.state !== "ready") {
    redirect("/myCogs");
  }

  const { owner, repo } = status;

  let cogPath = "";

  try {
    cogPath = await resolveRootCogPath(owner, repo, decodedCogId);
  } catch (error) {
    console.error("Failed to read cogsIndex.json", error);
  }

  if (!cogPath) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">RootCog Not Found</h1>
        <p className="text-muted-foreground mb-8">The Cog &quot;{decodedCogId}&quot; could not be found in your index.</p>
        <Link href="/myCogs" className={buttonVariants()}>
          Back to My Cogs
        </Link>
      </div>
    );
  }

  let content = "";
  let rootCogInfo: any = {};

  try {
    const fileData = await getRepositoryContent(owner, repo, `${cogPath}/rootCog.md`);
    if (fileData && !Array.isArray(fileData) && "content" in fileData) {
      content = Buffer.from(fileData.content, "base64").toString("utf8");
    }

    const infoData = await getRepositoryContent(owner, repo, `${cogPath}/rootCogInfo.json`);
    if (infoData && !Array.isArray(infoData) && "content" in infoData) {
      rootCogInfo = JSON.parse(Buffer.from(infoData.content, "base64").toString("utf8"));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error && typeof error === "object" && "name" in error && "AuthenticationRequiredError" === error.name) {
      redirect("/login");
    }
    console.error("Failed to load cog content", error);
  }

  let createdAt = rootCogInfo.createdAt || "";
  let lastModified = rootCogInfo.updatedAt || "";

  try {
    const octokit = await getOctokit();
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path: cogPath,
      per_page: 100,
    });
    if (commits && commits.length > 0) {
      if (!lastModified) {
        lastModified = commits[0].commit.committer?.date || commits[0].commit.author?.date || "";
      }
      if (!createdAt) {
        createdAt = commits[commits.length - 1].commit.committer?.date || commits[commits.length - 1].commit.author?.date || "";
      }
    }
  } catch (error) {
    console.error("Failed to fetch commit history for timestamps", error);
  }

  const projectValue = rootCogInfo.project || "No Parent Project";

  const metadataContent = (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {createdAt && <span>Created: {new Date(createdAt).toLocaleString()}</span>}
      {lastModified && <span>Last modified: {new Date(lastModified).toLocaleString()}</span>}
    </div>
  );

  return (
    <CogWorkspaceShell
      titleContent={
        <input
          type="text"
          value={rootCogInfo.title || decodedCogId}
          disabled
          className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        />
      }
      actionContent={
        <Button variant="outline" className="w-full group relative cursor-help" disabled>
          <Volume2 className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">YappOut</span>
          <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
            YappOut
          </div>
        </Button>
      }
      metadataContent={metadataContent}
      control1Content={
        <Select value={projectValue} disabled>
          <SelectTrigger className="w-full h-10 disabled:opacity-50 [&>svg]:hidden">
            <SelectValue>{projectValue}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={projectValue}>{projectValue}</SelectItem>
          </SelectContent>
        </Select>
      }
      control2Content={
        <Select disabled value="versions">
          <SelectTrigger className="w-full h-10 disabled:opacity-50">
            <SelectValue placeholder="Versions" />
          </SelectTrigger>
        </Select>
      }
      control3Content={
        <Link
          href={`/myCogs/${decodedCogId}/editCog`}
          className={cn(buttonVariants({ variant: "secondary" }), "w-full bg-[#4B0084] hover:bg-[#3A0066] text-white hover:text-white")}
        >
          Edit in ViewCog
        </Link>
      }
      control4Content={
        <div className="flex w-full gap-2 min-w-0">
          <Button
            className="w-[75%] bg-[#FFFF11] hover:bg-[#e6e60f] text-black shrink-0"
            disabled
          >
            Publish
          </Button>
          <DeleteCogButton cogId={decodedCogId} disabled />
        </div>
      }
    >
      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground w-full">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </CogWorkspaceShell>
  );
}
