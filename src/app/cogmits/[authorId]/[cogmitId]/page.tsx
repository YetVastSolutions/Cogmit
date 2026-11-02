import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";
import { ViewCog } from "@/components/ViewCog";
import { headers } from "next/headers";
import { Metadata } from "next";
import { getCanonicalCogmitUrl, MAX_ROOTCOG_TITLE_LENGTH } from "@/lib/utils";

interface PublicCogmitPageProps {
  params: Promise<{ authorId: string; cogmitId: string }>;
}

export interface PublishedCogmit {
  title: string;
  description: string;
  image?: string;
  content: string;
  authorId: string;
  cogmitId: string;
  publishedAt?: string;
}

export async function getPublishedCogmit(
  authorId: string,
  cogmitId: string
): Promise<PublishedCogmit | null> {
  const decodedAuthorId = decodeURIComponent(authorId);
  const decodedCogmitId = decodeURIComponent(cogmitId);
  const targetRepo = "YVSApps_Data_Cogmit_Public";

  // Fast path 1: Fetch directly from raw.githubusercontent.com (rate-limit free, edge-cached)
  try {
    const indexUrl = `https://raw.githubusercontent.com/${decodedAuthorId}/${targetRepo}/HEAD/cogmits/cogmitsIndex.json`;
    const res = await fetch(indexUrl, {
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const publicIndexObj = await res.json();
      const cogInfo = publicIndexObj.cogmits?.find(
        (c: { cogmitId?: string; id?: string }) =>
          c.cogmitId === decodedCogmitId || c.id === decodedCogmitId
      );

      if (cogInfo && cogInfo.path) {
        const contentUrl = `https://raw.githubusercontent.com/${decodedAuthorId}/${targetRepo}/HEAD/${cogInfo.path}`;
        const contentRes = await fetch(contentUrl, {
          next: { revalidate: 60 },
        });

        const content = contentRes.ok ? await contentRes.text() : "";

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
    }
  } catch {
    // If raw fetch fails (e.g. offline, network error, or custom branch), fall back to Octokit below
  }

  // Fallback 2: Octokit REST API
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
      } catch {
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
  } catch {
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
  } catch {
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
      description: "This Cogmit could not be found or is not public.",
      openGraph: {
        title: "Cogmit Not Found",
        description: "This Cogmit could not be found or is not public.",
        siteName: "Cogmit",
        type: "website",
      },
      twitter: {
        card: "summary",
        title: "Cogmit Not Found",
        description: "This Cogmit could not be found or is not public.",
      },
    };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL 
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
    || "https://cogmit.com";
  const url = getCanonicalCogmitUrl(origin, cogmit.authorId, cogmit.cogmitId);
  
  const truncatedTitle = (cogmit.title || "").slice(0, MAX_ROOTCOG_TITLE_LENGTH);
  const sharingText = `Cogmit | ${cogmit.authorId}: ${truncatedTitle}`;

  return {
    title: sharingText,
    description: sharingText,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: sharingText,
      description: sharingText,
      url: url,
      siteName: "Cogmit",
      type: "article",
      publishedTime: cogmit.publishedAt,
      authors: [cogmit.authorId],
      ...(cogmit.image ? { images: [{ url: cogmit.image }] } : {}),
    },
    twitter: {
      card: cogmit.image ? "summary_large_image" : "summary",
      title: sharingText,
      description: sharingText,
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

  let host = "";
  let protocol = "https";
  try {
    const headersList = await headers();
    host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
    protocol = headersList.get("x-forwarded-proto") ?? "https";
  } catch {
    // Request scope fallback
  }

  const baseOrigin = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
      || "https://cogmit.com");

  const shareUrl = getCanonicalCogmitUrl(baseOrigin, cogmit.authorId, cogmit.cogmitId);
  const currentUsername = session?.user?.name || (session?.user as { login?: string })?.login || "";
  const isAuthor = currentUsername === cogmit.authorId;

  return (
    <ViewCog
      title={cogmit.title}
      description={cogmit.description}
      project={""}
      content={cogmit.content}
      published={cogmit.publishedAt}
      mode="cogmit"
      authorId={cogmit.authorId}
      cogmitId={cogmit.cogmitId}
      shareUrl={shareUrl}
      isAuthor={isAuthor}
    />
  );
}
