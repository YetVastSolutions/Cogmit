import React from "react";
import fs from "fs/promises";
import path from "path";
import { ViewCog } from "@/components/ViewCog";
import { auth } from "@/auth";

export default async function AboutCogmitPage() {
  const dataDir = path.join(process.cwd(), "public", "sample-cog", "cogmit-about");

  let content = "";
  
  try {
    content = await fs.readFile(path.join(dataDir, "rootCog.md"), "utf-8");
  } catch {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-destructive mb-4">
          Sample Cog Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The public sample Cog could not be loaded.
        </p>
      </div>
    );
  }

  const createdAt = "";
  const lastModified = "";
  const title = "About Cogmit";
  const projectValue = "No Parent Project";

  const session = await auth();
  const currentUsername = session?.user?.name || (session?.user as { login?: string })?.login || "";
  const authorId = "Cogmit";
  const isAuthor = currentUsername === authorId;

  return (
    <ViewCog
      title={title}
      project={projectValue}
      content={content}
      createdAt={createdAt}
      lastModified={lastModified}
      mode="cogmit"
      authorId={authorId}
      isAuthor={isAuthor}
    />
  );
}
