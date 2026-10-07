"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Volume2, User, Share, Heart, MessageSquare, BookPlus } from "lucide-react";
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
  const [isLiked, setIsLiked] = useState(false);

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
        ) : mode === "cogmit" && authorId ? (
          <div className="flex flex-nowrap w-full items-center justify-center relative">
            {/* Left Container */}
            <div className="flex flex-1 justify-end pr-2 md:pr-4 gap-2 min-w-[88px]">
              <Button
                variant="outline"
                disabled
                className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none"
                aria-label="Add to Reads"
              >
                <span className="hidden md:inline whitespace-nowrap">Add to Reads</span>
                <BookPlus className="w-4 h-4 md:ml-2 shrink-0" />
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none"
                title="Copy link"
              >
                <span className="hidden md:inline whitespace-nowrap">{copied ? "Copied!" : "Share"}</span>
                <Share className="w-4 h-4 md:ml-2 shrink-0" />
              </Button>
            </div>

            {/* Center Container */}
            <div className="flex-none shrink-0 w-auto flex justify-center z-10 max-w-full min-w-0">
              <Link
                href={isAuthor ? "/" : `/cogmits/${authorId}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "bg-[#FFFF11] dark:bg-background hover:bg-[#e6e60f] dark:hover:bg-muted text-[#4B0084] dark:text-[#FFFF11] border-transparent dark:border-input font-medium flex items-center justify-center h-10 px-4 w-auto min-w-0 sm:min-w-[140px]"
                )}
              >
                <User className="w-4 h-4 mr-2 shrink-0" />
                <span className="whitespace-nowrap truncate min-w-0">
                  {authorId}
                  <span className="hidden sm:inline">
                    {project && project !== "No Parent Project" ? ` : ${project}` : ""}
                  </span>
                </span>
              </Link>
            </div>

            {/* Right Container */}
            <div className="flex flex-1 justify-start pl-2 md:pl-4 gap-2 min-w-[88px]">
              <Button
                variant="outline"
                onClick={() => setIsLiked(!isLiked)}
                className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none"
                aria-label="Like"
              >
                <span className="hidden md:inline whitespace-nowrap">{isLiked ? "Unlike" : "Like"}</span>
                <Heart className={cn("w-4 h-4 md:ml-2 shrink-0", isLiked ? "fill-red-500 text-red-500" : "")} />
              </Button>
              <Button variant="outline" disabled className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none" aria-label="Child Cog">
                <span className="hidden md:inline whitespace-nowrap">+ Child Cog</span>
                <MessageSquare className="w-4 h-4 md:ml-2 shrink-0" />
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground w-full">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </CogWorkspaceShell>
  );
}

