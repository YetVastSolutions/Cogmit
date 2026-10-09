import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import { ViewCog } from "@/components/ViewCog";
import { headers } from "next/headers";
import { Metadata } from "next";

interface PublicCogmitPageProps {
  params: Promise<{ authorId: string; cogmitId: string }>;
}

async function getPublishedCogmit(authorId: string, cogmitId: string) {
  const decodedAuthorId = decodeURIComponent(authorId);
  const decodedCogmitId = decodeURIComponent(cogmitId);
  const targetRepo = "YVSApps_Data_Cogmit_Public";

  let octokit: Octokit;
  try {
    octokit = new Octokit();
  } catch {
    return null;
  }

  let defaultBranch = "";
  try {
    const repoInfo = await octokit.rest.repos.get({
      owner: decodedAuthorId,
      repo: targetRepo,
    });
    defaultBranch = repoInfo.data.default_branch;
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      try {
        const repoInfo = await octokit.rest.repos.get({
          owner: decodedAuthorId,
          repo: targetRepo,
        });
        defaultBranch = repoInfo.data.default_branch;
      } catch (innerError) {
        return null;
      }
    } else {
      return null;
    }
  }

  if (!targetRepo || !defaultBranch) return null;

  let publicIndexObj = { cogmits: [] as { cogmitId?: string, id?: string, path?: string, title?: string, description?: string, image?: string, publishedAt?: string }[] };
  try {
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
      return null;
    }
  } catch (error) {
    return null;
  }

  const cogInfo = publicIndexObj.cogmits?.find(
    (c) => c.cogmitId === decodedCogmitId || c.id === decodedCogmitId
  );

  if (!cogInfo || !cogInfo.path) return null;

  let content = "";
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: decodedAuthorId,
      repo: targetRepo,
      path: cogInfo.path,
      ref: defaultBranch,
    });
    if (data && !Array.isArray(data) && "content" in data) {
      content = Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch (error) {
    return null;
  }

  return {
    title: cogInfo.title || decodedCogmitId,
    description: cogInfo.description || "",
    image: cogInfo.image,
    content,
    authorId: decodedAuthorId,
    cogmitId: decodedCogmitId,
    publishedAt: cogInfo.publishedAt,
  };
}

export async function generateMetadata({ params }: PublicCogmitPageProps): Promise<Metadata> {
  const { authorId, cogmitId } = await params;
  const cogmit = await getPublishedCogmit(authorId, cogmitId);
  
  if (!cogmit) {
    return {
      title: "Cogmit Not Found",
      description: "This Cogmit could not be found or is not public."
    };
  }

  const url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'cogmit.com'}/cogmits/${cogmit.authorId}/${cogmit.cogmitId}`;
  
  const truncatedDescription = cogmit.description && cogmit.description.length > 157 
    ? `${cogmit.description.slice(0, 156)}…` 
    : cogmit.description;

  return {
    title: cogmit.title,
    description: truncatedDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: cogmit.title,
      description: truncatedDescription,
      url: url,
      type: "article",
      publishedTime: cogmit.publishedAt,
      authors: [cogmit.authorId],
      ...(cogmit.image ? { images: [{ url: cogmit.image }] } : {}),
    },
    twitter: {
      card: cogmit.image ? "summary_large_image" : "summary",
      title: cogmit.title,
      description: truncatedDescription,
      ...(cogmit.image ? { images: [cogmit.image] } : {}),
    }
  };
}

export default async function CogmitPage({ params }: PublicCogmitPageProps) {
  const { authorId, cogmitId } = await params;
  const session = await auth().catch(() => null);
  
  const cogmit = await getPublishedCogmit(authorId, cogmitId);

  if (!cogmit) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">Cogmit Not Found</h1>
        <p className="text-muted-foreground">The Cogmit could not be found in the published index.</p>
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  const shareUrl = `${protocol}://${host}/cogmits/${cogmit.authorId}/${cogmit.cogmitId}`;
  const currentUsername = session?.user?.name || (session?.user as { login?: string })?.login || "";
  const isAuthor = currentUsername === cogmit.authorId;

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
      <ViewCog
        title={cogmit.title}
        description={cogmit.description}
        project={""}
        content={cogmit.content}
        mode="cogmit"
        authorId={cogmit.authorId}
        cogmitId={cogmit.cogmitId}
        shareUrl={shareUrl}
        isAuthor={isAuthor}
      />
    </div>
  );
}
