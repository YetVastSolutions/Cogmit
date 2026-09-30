"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Volume2, User, Share, Heart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CogActionRow } from "@/components/CogActionRow";

export interface ViewCogProps {
  title: string;
  project?: string;
  content: string;
  createdAt?: string;
  lastModified?: string;
  
  mode?: "private" | "cogmit";
  
  // Private mode options
  editUrl?: string;

  deleteCogId?: string;
  cogId?: string;
  projects?: string[];
  onMoveProject?: (projectName: string, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
  
  // Cogmit mode options

  authorId?: string;
  cogmitId?: string;
  shareUrl?: string;
  isAuthor?: boolean;
}

export function ViewCog({
  title,
  project = "No Parent Project",
  content,
  createdAt,
  lastModified,
  mode = "private",
  editUrl,

  deleteCogId,
  cogId,
  projects = [],
  onMoveProject,

  authorId,
  shareUrl,
  isAuthor = false,
}: ViewCogProps) {
  const [copied, setCopied] = useState(false);

  const metadataContent = (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {createdAt && (
        <span>Created: {new Date(createdAt).toLocaleString()}</span>
      )}
      {lastModified && (
        <span>Last modified: {new Date(lastModified).toLocaleString()}</span>
      )}
    </div>
  );

  const handleShare = async () => {
    const urlToShare = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (!urlToShare) return;
    try {
      await navigator.clipboard.writeText(urlToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard failed", e);
    }
  };

  return (
    <CogWorkspaceShell
      titleContent={
        <input
          type="text"
          value={title}
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
      metadataContent={mode === "private" ? metadataContent : undefined}
      actionRowContent={
        mode === "private" ? (
          <CogActionRow
            mode="view"
            project={project}
            projectEnabled={false}
            projects={projects}
            onMoveProject={onMoveProject}
            shareEnabled={false}
            cogInEnabled={false}
            editCogEnabled={true}
            editUrl={editUrl}
            cogmitEnabled={false}
            optionsEnabled={true}
            cogId={cogId}
            deleteEnabled={!!deleteCogId} // Only allow delete if they have the right
          />
        ) : undefined
      }
      control1Content={
        mode === "cogmit" && authorId ? (
          <Link
            href={isAuthor ? "/" : `/cogmits/${authorId}`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start truncate")}
          >
            <User className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Cogmit: {authorId}</span>
          </Link>
        ) : undefined
      }
      control2Content={
        mode === "cogmit" ? (
          <div className={cn(buttonVariants({ variant: "outline" }), "w-full cursor-default truncate flex items-center justify-start text-muted-foreground")}>
            <span className="truncate">{project}</span>
          </div>
        ) : undefined
      }
      control3Content={
        mode === "cogmit" ? (
          <Button 
            variant="outline" 
            className="w-full justify-center" 
            onClick={handleShare}
            title="Copy link"
          >
            <Share className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Share"}
          </Button>
        ) : undefined
      }
      control4Content={
        mode === "cogmit" ? (
          <Button variant="outline" className="w-full justify-center" disabled>
            <Heart className="w-4 h-4 mr-2" />
            Like
          </Button>
        ) : undefined
      }
    >
      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground w-full">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </CogWorkspaceShell>
  );
}

