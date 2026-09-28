import { getOctokit } from "@/lib/github";
import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

export default async function PublicCogPage({ params }: { params: Promise<{ userId: string; cogId: string }> }) {
  const { userId, cogId } = await params;
  const decodedUserId = decodeURIComponent(userId);
  const decodedCogId = decodeURIComponent(cogId);
  const repoName = "YVSApps_Cogmit_Data";

  // Attempt to get authenticated octokit if a session exists (might help with rate limits or if it's a GitHub App),
  // otherwise fallback to unauthenticated.
  let octokit: Octokit;
  try {
    const session = await auth();
    if (session) {
      octokit = await getOctokit();
    } else {
      octokit = new Octokit();
    }
  } catch {
    octokit = new Octokit();
  }

  let publicIndexObj = { cogs: [] as any[] };
  let cogPath = "";
  let project = "";
  let publishedAt = "";

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: decodedUserId,
      repo: repoName,
      path: "publicCogsIndex.json",
    });

    if (data && !Array.isArray(data) && "content" in data) {
      const contentStr = Buffer.from(data.content, "base64").toString("utf-8");
      publicIndexObj = JSON.parse(contentStr);
      
      const cogInfo = publicIndexObj.cogs?.find((c: any) => c.id === decodedCogId);
      if (cogInfo && cogInfo.path) {
        cogPath = cogInfo.path;
        project = cogInfo.project || "NPPCog";
        publishedAt = cogInfo.publishedAt || "";
      }
    }
  } catch (error) {
    console.error("Failed to read publicCogsIndex.json", error);
  }

  if (!cogPath) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Cog Not Found</h1>
        <p className="text-muted-foreground">The Cog could not be found or is not published publicly.</p>
      </div>
    );
  }

  let content = "";
  let title = decodedCogId;

  try {
    const { data: mdData } = await octokit.rest.repos.getContent({
      owner: decodedUserId,
      repo: repoName,
      path: `${cogPath}/rootCog.md`,
    });
    if (mdData && !Array.isArray(mdData) && "content" in mdData) {
      content = Buffer.from(mdData.content, "base64").toString("utf8");
    }

    const { data: infoData } = await octokit.rest.repos.getContent({
      owner: decodedUserId,
      repo: repoName,
      path: `${cogPath}/rootCogInfo.json`,
    });
    if (infoData && !Array.isArray(infoData) && "content" in infoData) {
      const infoObj = JSON.parse(Buffer.from(infoData.content, "base64").toString("utf8"));
      if (infoObj.title) {
        title = infoObj.title;
      }
    }
  } catch (error) {
    console.error("Failed to load public cog content", error);
  }

  return (
    <div className="flex flex-col bg-background w-full max-w-[var(--page-content-max-width)] mx-auto h-[calc(100vh-64px)] overflow-hidden">
      {/* FIXED HEADER AREA */}
      <div className="shrink-0 pt-8 px-4 sm:px-8 bg-background z-10 flex flex-col gap-4 border-b border-border pb-4">
        {/* ROW 1: Author */}
        <div className="text-sm font-medium text-muted-foreground">
          Author: <Link href={`/${decodedUserId}`} className="text-primary hover:underline">{decodedUserId}</Link>
        </div>

        {/* ROW 2: Project & Published Date */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="bg-muted px-2 py-1 rounded-md text-foreground">
            {project}
          </div>
          <span className="opacity-50">|</span>
          <div>
            Published: {publishedAt ? new Date(publishedAt).toLocaleString() : "Unknown"}
          </div>
        </div>

        {/* ROW 3: Title and YappOut */}
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-primary flex-1 break-words w-[80%]">
            {title}
          </h1>
          <div className="w-[20%] flex justify-end shrink-0 group relative cursor-help">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            </div>
            <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
              YappOut
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-8 py-6">
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
