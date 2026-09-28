"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  MessageSquarePlus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  GitCommit,
  UploadCloud,
} from "lucide-react";

export type CogNode = {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  children?: CogNode[];
  bookmarked?: boolean;
};

interface CogProps {
  node: CogNode;
  isRoot?: boolean;
  selectedCogId: string | null;
  onSelect: (id: string) => void;
  onBookmarkToggle?: (id: string) => void;
  onCogit?: (id: string) => void;
  onCogmit?: (id: string) => void;
  depth?: number;
}

export function Cog({
  node,
  isRoot = false,
  selectedCogId,
  onSelect,
  onBookmarkToggle,
  onCogit,
  onCogmit,
  depth = 0,
}: CogProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedCogId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle?.(node.id);
  };

  const handleCogit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCogit?.(node.id);
  };

  const handleCogmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCogmit?.(node.id);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className={cn("flex flex-col", isRoot ? "" : "mt-4")}>
      {!isRoot && (
        <div
          className={cn(
            "cog-header flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-t-md border border-border border-b-0 cursor-pointer transition-colors",
            isSelected ? "border-yellow-500 bg-yellow-500/10" : "hover:border-yellow-500"
          )}
          onClick={handleSelect}
        >
          {hasChildren && (
            <button
              onClick={toggleExpand}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}

          <div className="flex flex-col flex-1">
            <span className="text-sm font-semibold text-foreground">
              {node.author}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(node.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleBookmark}
              className={cn(
                "p-2 rounded hover:bg-muted transition-colors",
                node.bookmarked ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
              )}
              title="Bookmark"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={handleCogit}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cogit (Derive/Version)"
            >
              <GitCommit className="w-4 h-4" />
            </button>
            <button
              onClick={handleCogmit}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cogmit (Publish)"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
            <button
              onClick={handleSelect}
              className={cn(
                "p-2 rounded transition-colors",
                isSelected
                  ? "text-yellow-500 bg-yellow-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Add Child"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex",
          !isRoot && "border-l-2 border-border ml-3 pl-4",
          !isRoot && isSelected && "border-yellow-500"
        )}
      >
        <div className="flex-1 flex flex-col min-w-0">
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none text-foreground cursor-text",
              isRoot ? "mb-6" : "mb-2 p-3 bg-card border border-border rounded-b-md rounded-tr-md",
              isSelected && !isRoot ? "border-yellow-500" : ""
            )}
            onClick={isRoot ? undefined : handleSelect}
          >
            {/* Very simple markdown renderer for demonstration, a real app might use react-markdown */}
            {node.content.split("\n").map((line, i) => (
              <p key={i} className="my-1">
                {line || <br />}
              </p>
            ))}
          </div>

          {expanded && hasChildren && (
            <div className="flex flex-col gap-2">
              {node.children!.map((child) => (
                <Cog
                  key={child.id}
                  node={child}
                  isRoot={false}
                  selectedCogId={selectedCogId}
                  onSelect={onSelect}
                  onBookmarkToggle={onBookmarkToggle}
                  onCogit={onCogit}
                  onCogmit={onCogmit}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
