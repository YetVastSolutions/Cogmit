"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import { ResponsiveActionGroups, ToolbarItem } from "@/components/ResponsiveActionGroups";
import { Button, buttonVariants } from "@/components/ui/button";
import { Volume2, User, Share, Heart, MessageSquare, BookPlus, Eye } from "lucide-react";

import MarkdownIt from "markdown-it";
// @ts-expect-error missing types
import markdownItTaskLists from "markdown-it-task-lists";
import { marked } from "marked";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import showdown from "showdown";
import { Parser as CommonmarkParser, HtmlRenderer as CommonmarkRenderer } from "commonmark";
import DOMPurify from "isomorphic-dompurify";
import Link from "next/link";
import { cn, formatTimestamp, getCanonicalCogmitUrl } from "@/lib/utils";
import { CogActionRow } from "@/components/CogActionRow";
import { MarqueeContent } from "@/components/MarqueeContent";
import { ShareCogmitModal } from "@/components/ShareCogmitModal";

const parsers = [
  {
    name: "v1", // markdown-it
    tooltip: "markdown-it",
    parse: async (md: string) => {
      const mdIt = new MarkdownIt({ html: true, linkify: true, typographer: true })
        .use(markdownItTaskLists, { enabled: false });
      return mdIt.render(md);
    },
  },
  {
    name: "v2", // Marked
    tooltip: "Marked",
    parse: async (md: string) => {
      return marked.parse(md, { gfm: true });
    },
  },
  {
    name: "v3", // remark
    tooltip: "remark (unified pipeline)",
    parse: async (md: string) => {
      const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(md);
      return String(result);
    },
  },
  {
    name: "v4", // micromark
    tooltip: "micromark",
    parse: async (md: string) => {
      return micromark(md, {
        allowDangerousHtml: true,
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()]
      });
    },
  },
  {
    name: "v5", // Showdown
    tooltip: "Showdown",
    parse: async (md: string) => {
      const converter = new showdown.Converter({
        tables: true,
        strikethrough: true,
        tasklists: true
      });
      return converter.makeHtml(md);
    },
  },
  {
    name: "v6", // commonmark.js
    tooltip: "commonmark.js",
    parse: async (md: string) => {
      const reader = new CommonmarkParser();
      const writer = new CommonmarkRenderer();
      const parsed = reader.parse(md);
      return writer.render(parsed);
    },
  },
];

export interface ViewCogProps {
  title: string;
  description?: string;
  project?: string;
  content: string;
  createdAt?: string;
  lastModified?: string;
  published?: string;

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
  description,
  project = "No Parent Project",
  content,
  createdAt,
  lastModified,
  published,
  mode = "private",
  editUrl,

  deleteCogId,
  cogId,
  projects = [],
  onMoveProject,

  authorId,
  cogmitId,
  shareUrl,
  isAuthor = false,
}: ViewCogProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Custom parsers state
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "cogmit" || !content) return;

    let isMounted = true;
    
    async function renderMarkdown() {
      setIsTransitioning(true);
      setRenderError(null);
      
      try {
        const parser = parsers[currentViewIndex];
        const htmlContent = await parser.parse(content);
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);
        
        if (isMounted) {
          setRenderedHtml(sanitizedHtml);
          setIsTransitioning(false);
        }
      } catch (err) {
        if (isMounted) {
          setRenderError((err as Error).message);
          setIsTransitioning(false);
        }
      }
    }
    
    renderMarkdown();
    
    return () => {
      isMounted = false;
    };
  }, [mode, content, currentViewIndex]);

  const isPublished = !!published;
  
  const staticItems = [
    <span key="published" className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium text-black ${isPublished ? "bg-[#FFFF11]" : "bg-green-500"}`}>
      {isPublished ? `Published ${formatTimestamp(published)}` : "Not published"}
    </span>
  ];

  const marqueeItems = [
    lastModified ? (
      <span key="2">Cog last modified: {formatTimestamp(lastModified)}</span>
    ) : null,
    createdAt ? (
      <span key="3">Cog created: {formatTimestamp(createdAt)}</span>
    ) : null,
  ].filter(Boolean) as React.ReactNode[];

  const metadataContent = (
    <MarqueeContent 
      staticItems={staticItems}
      items={marqueeItems} 
    />
  );

  const resolvedShareUrl = shareUrl || 
    (authorId && cogmitId && typeof window !== "undefined"
      ? getCanonicalCogmitUrl(window.location.origin, authorId, cogmitId)
      : "");

  const handleShare = async () => {
    if (resolvedShareUrl) {
      setShowShareModal(true);
    }
  };

  let showCogmit = false;
  if (!published) {
    showCogmit = true;
  } else if (lastModified) {
    showCogmit = new Date(lastModified) > new Date(published);
  }
  const showShare = !showCogmit;

  let shouldShowTitle = mode === "cogmit";
  if (shouldShowTitle && content) {
    const trimmed = content.trim();
    const titleLower = title.trim().toLowerCase();
    
    // Check if starts with `# Title`
    const startsWithHashTitle = trimmed.toLowerCase().startsWith(`# ${titleLower}`);
    
    // Check if starts with `Title\n===`
    const startsWithUnderlineTitle = trimmed.toLowerCase().startsWith(titleLower + '\n=') || trimmed.toLowerCase().startsWith(titleLower + '\r\n=');
    
    if (startsWithHashTitle || startsWithUnderlineTitle) {
      shouldShowTitle = false;
    }
  }

  return (
    <CogWorkspaceShell
      titleContent={
        mode === "private" ? (
          <input
            type="text"
            value={title}
            disabled
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          />
        ) : undefined
      }
      actionContent={
        mode === "private" ? (
          <Button variant="outline" className="w-full group relative cursor-help" disabled>
            <Volume2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">YappOut</span>
            <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
              YappOut
            </div>
          </Button>
        ) : undefined
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
            shareEnabled={true}
            shareVisible={showShare}
            onShare={handleShare}
            cogInEnabled={false}
            editCogEnabled={true}
            editUrl={editUrl}
            cogmitEnabled={true}
            cogmitVisible={showCogmit}
            cogmitTooltip={
              showCogmit
                ? "Last Cog in wasn't published as Cogmit.\nTo share last published cogmit Please share from My Cogmits"
                : undefined
            }
            optionsEnabled={true}
            cogId={cogId}
            deleteEnabled={!!deleteCogId} // Only allow delete if they have the right
          />
        ) : mode === "cogmit" && authorId ? (
          <ResponsiveActionGroups
            leftItems={[
              {
                id: "author",
                node: (
                  <Link
                    href={isAuthor ? "/" : `/cogmits/${authorId}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "bg-[#FFFF11] dark:bg-background hover:bg-[#e6e60f] dark:hover:bg-muted text-[#4B0084] dark:text-[#FFFF11] border-transparent dark:border-input font-medium flex items-center justify-center h-10 px-4 whitespace-nowrap w-full md:w-auto min-w-[140px]"
                    )}
                  >
                    <User className="w-4 h-4 mr-2 shrink-0" />
                    <span>
                      {authorId}
                      <span className="hidden sm:inline">
                        {project && project !== "No Parent Project" ? ` : ${project}` : ""}
                      </span>
                    </span>
                  </Link>
                ),
                compactNode: (
                  <Link
                    href={isAuthor ? "/" : `/cogmits/${authorId}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "bg-[#FFFF11] dark:bg-background hover:bg-[#e6e60f] dark:hover:bg-muted text-[#4B0084] dark:text-[#FFFF11] border-transparent dark:border-input font-medium flex items-center justify-center h-10 px-4 whitespace-nowrap w-auto min-w-[140px]"
                    )}
                  >
                    <User className="w-4 h-4 mr-2 shrink-0" />
                    <span>
                      {authorId}
                      <span className="hidden sm:inline">
                        {project && project !== "No Parent Project" ? ` : ${project}` : ""}
                      </span>
                    </span>
                  </Link>
                )
              },
              {
                id: "view-modes",
                hideOrder: 2,
                node: (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentViewIndex((prev) => (prev + 1) % parsers.length)}
                    disabled={isTransitioning}
                    className="shrink-0 h-10 w-full md:w-auto px-4 flex-none group relative"
                    aria-label={`Switch Markdown parser: ${parsers[currentViewIndex].tooltip}`}
                  >
                    <span className="whitespace-nowrap">{parsers[currentViewIndex].name}</span>
                    <Eye className="w-4 h-4 ml-2 shrink-0" />
                    <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
                      {parsers[currentViewIndex].tooltip}
                    </div>
                  </Button>
                ),
                compactNode: (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentViewIndex((prev) => (prev + 1) % parsers.length)}
                    disabled={isTransitioning}
                    className="shrink-0 h-10 w-10 px-0 flex-none group relative"
                    aria-label={`Switch Markdown parser: ${parsers[currentViewIndex].tooltip}`}
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
                      {parsers[currentViewIndex].tooltip}
                    </div>
                  </Button>
                )
              },
              {
                id: "add-to-reads",
                hideOrder: 1,
                node: (
                  <Button
                    variant="outline"
                    disabled
                    className="shrink-0 h-10 w-full md:w-auto px-4 flex-none"
                    aria-label="Add to Reads"
                  >
                    <span className="whitespace-nowrap">Add to Reads</span>
                    <BookPlus className="w-4 h-4 ml-2 shrink-0" />
                  </Button>
                ),
                compactNode: (
                  <Button
                    variant="outline"
                    disabled
                    className="shrink-0 h-10 w-10 px-0 flex-none"
                    aria-label="Add to Reads"
                  >
                    <BookPlus className="w-4 h-4 shrink-0" />
                  </Button>
                )
              }
            ]}
            rightItems={[
              {
                id: "child-cog",
                hideOrder: 1,
                node: (
                  <Button variant="outline" disabled className="shrink-0 h-10 w-full md:w-auto px-4 flex-none" aria-label="Child Cog">
                    <span className="whitespace-nowrap">+ Child Cog</span>
                    <MessageSquare className="w-4 h-4 ml-2 shrink-0" />
                  </Button>
                ),
                compactNode: (
                  <Button variant="outline" disabled className="shrink-0 h-10 w-10 px-0 flex-none" aria-label="Child Cog">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                  </Button>
                )
              },
              {
                id: "share",
                node: (
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="shrink-0 h-10 w-full md:w-auto px-4 flex-none"
                    title="Copy link"
                  >
                    <span className="whitespace-nowrap">Share</span>
                    <Share className="w-4 h-4 ml-2 shrink-0" />
                  </Button>
                ),
                compactNode: (
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="shrink-0 h-10 w-10 px-0 flex-none"
                    title="Copy link"
                  >
                    <Share className="w-4 h-4 shrink-0" />
                  </Button>
                )
              },
              {
                id: "like",
                node: (
                  <Button
                    variant="outline"
                    onClick={() => setIsLiked(!isLiked)}
                    className="shrink-0 h-10 w-full md:w-auto px-4 flex-none"
                    aria-label="Like"
                  >
                    <span className="whitespace-nowrap">{isLiked ? "Unlike" : "Like"}</span>
                    <Heart className={cn("w-4 h-4 ml-2 shrink-0", isLiked ? "fill-red-500 text-red-500" : "")} />
                  </Button>
                ),
                compactNode: (
                  <Button
                    variant="outline"
                    onClick={() => setIsLiked(!isLiked)}
                    className="shrink-0 h-10 w-10 px-0 flex-none"
                    aria-label="Like"
                  >
                    <Heart className={cn("w-4 h-4 shrink-0", isLiked ? "fill-red-500 text-red-500" : "")} />
                  </Button>
                )
              },
              {
                id: "yappout",
                node: (
                  <Button variant="outline" className="w-full md:w-auto shrink-0 h-10 px-4 group relative cursor-help flex-none" disabled>
                    <span className="whitespace-nowrap">YappOut</span>
                    <Volume2 className="w-4 h-4 ml-2 shrink-0" />
                    <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
                      YappOut
                    </div>
                  </Button>
                ),
                compactNode: (
                  <Button variant="outline" className="shrink-0 h-10 w-10 px-0 group relative cursor-help flex-none" disabled>
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md border border-border">
                      YappOut
                    </div>
                  </Button>
                )
              }
            ]}
          />
        ) : undefined
      }
    >
      {isTransitioning && mode === "cogmit" && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="bg-card p-6 rounded-lg shadow-lg border border-border flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-lg font-medium">Please wait…</p>
          </div>
        </div>
      )}

      {mode === "cogmit" ? (
        <div className="w-full">
          {renderError && (
            <div className="mb-4 p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
              Error rendering view: {renderError}
            </div>
          )}
          {shouldShowTitle && (
            <h1 className="text-4xl font-extrabold tracking-tight mb-8 mt-2 text-foreground break-words">
              {title}
            </h1>
          )}
          <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderedHtml || "" }} />
        </div>
      ) : (
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground w-full">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

      <ShareCogmitModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        title={title}
        description={description}
        authorId={authorId}
        published={published}
        shareUrl={resolvedShareUrl}
      />
    </CogWorkspaceShell>
  );
}

