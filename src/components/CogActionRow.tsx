"use client";

import React, { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Share, Save, Pencil, Megaphone, MoreHorizontal, Pin } from "lucide-react";
import { ProjectDisplay } from "@/components/ProjectDisplay";
import { CogOptionsModal } from "@/components/CogOptionsModal";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CogActionRowProps {
  mode: "view" | "edit";
  
  // Project
  project: string;
  projectEnabled: boolean;
  projects?: string[];
  onMoveProject?: (projectName: string, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
  
  // Share
  shareEnabled: boolean;
  shareVisible?: boolean;
  onShare?: () => void;
  
  // Cog In
  cogInEnabled: boolean;
  onCogIn?: () => void;
  isCogInPending?: boolean;
  
  // Edit Cog
  editCogEnabled: boolean;
  editUrl?: string;
  onEditCog?: () => void;
  
  // Cogmit
  cogmitEnabled: boolean;
  cogmitVisible?: boolean;
  onCogmit?: () => void;
  isCogmitPending?: boolean;
  cogmitTooltip?: React.ReactNode;
  
  // Options
  optionsEnabled: boolean;
  cogId?: string;
  deleteEnabled?: boolean;
}

export function CogActionRow({
  mode,
  project, projectEnabled, projects, onMoveProject,
  shareEnabled, shareVisible = true, onShare,
  cogInEnabled, onCogIn, isCogInPending,
  editCogEnabled, editUrl, onEditCog,
  cogmitEnabled, cogmitVisible = true, onCogmit, isCogmitPending, cogmitTooltip,
  optionsEnabled, cogId, deleteEnabled
}: CogActionRowProps) {
  const [isPinned, setIsPinned] = useState(false);

  return (
    <div className="flex flex-nowrap w-full items-center justify-center relative">
      {/* Left Container */}
      <div className="flex flex-1 justify-end pr-2 md:pr-4 gap-2 min-w-[88px]">
        {/* Pin */}
        <Button 
          variant="outline" 
          className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none" 
          aria-label={isPinned ? "Unpin" : "Pin"}
          onClick={() => setIsPinned(!isPinned)}
        >
          <span className="hidden md:inline whitespace-nowrap">{isPinned ? "Pinned" : "Pin"}</span>
          <Pin className={cn("w-4 h-4 md:ml-2 shrink-0", isPinned && "fill-current")} />
        </Button>

        {/* Edit Cog / Cog In */}
        {mode === "view" ? (
          editUrl ? (
            <Link
              href={!editCogEnabled ? "#" : editUrl}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none",
                !editCogEnabled && "opacity-50 pointer-events-none cursor-not-allowed"
              )}
            >
              <span className="hidden md:inline whitespace-nowrap">Edit Cog</span>
              <Pencil className="w-4 h-4 md:ml-2 shrink-0" />
            </Link>
          ) : (
            <Button 
              variant="outline"
              className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none"
              disabled={!editCogEnabled}
              onClick={onEditCog}
            >
              <span className="hidden md:inline whitespace-nowrap">Edit Cog</span>
              <Pencil className="w-4 h-4 md:ml-2 shrink-0" />
            </Button>
          )
        ) : (
          <Button 
            variant="secondary" 
            className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none bg-[#4B0084] hover:bg-[#3A0066] text-white hover:text-white disabled:opacity-50"
            disabled={!cogInEnabled || isCogInPending}
            onClick={onCogIn}
          >
            <span className="hidden md:inline whitespace-nowrap">Cog In</span>
            <Save className="w-4 h-4 md:ml-2 shrink-0" />
          </Button>
        )}
      </div>

      {/* Center Container */}
      <div className="flex-none shrink-0 w-auto flex justify-center z-10 max-w-full min-w-0">
        <ProjectDisplay 
          project={project} 
          disabled={!projectEnabled} 
          projects={projects} 
          onSave={onMoveProject}
          className="h-10 px-4 w-auto min-w-0 sm:min-w-[140px] flex items-center justify-center"
        />
      </div>

      {/* Right Container */}
      <div className="flex flex-1 justify-start pl-2 md:pl-4 gap-2 min-w-[88px]">
        {/* Share (Only in View Mode) */}
        {mode === "view" && shareVisible && (
          <Button 
            className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none bg-[#FFFF11] hover:bg-[#e6e60f] text-black" 
            disabled={!shareEnabled}
            onClick={onShare}
          >
            <span className="hidden md:inline whitespace-nowrap">Share</span>
            <Share className="w-4 h-4 md:ml-2 shrink-0" />
          </Button>
        )}

        {/* Cogmit */}
        {cogmitVisible && (
          <div className={cn("relative group", cogmitTooltip && "cursor-help inline-block")}>
            <Button 
              type="button"
              className={cn("shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none bg-[#FFFF11] hover:bg-[#e6e60f] text-black", cogmitTooltip && "cursor-help pointer-events-auto")}
              disabled={!cogmitEnabled || isCogmitPending}
              onClick={onCogmit}
            >
              <span className="hidden md:inline whitespace-nowrap">Cogmit</span>
              <Megaphone className="w-4 h-4 md:ml-2 shrink-0" />
            </Button>
            {cogmitTooltip && (
              <div className="absolute right-0 top-full mt-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-pre-wrap z-50 shadow-md border border-border w-max max-w-[250px] text-left">
                {cogmitTooltip}
              </div>
            )}
          </div>
        )}

        {/* Options */}
        {optionsEnabled && cogId ? (
          <CogOptionsModal cogId={cogId} className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none" deleteEnabled={deleteEnabled} />
        ) : (
          <Button 
            variant="outline" 
            className="shrink-0 h-10 w-10 px-0 md:w-auto md:px-4 flex-none"
            disabled
            aria-label="Cog options"
          >
            <span className="hidden md:inline whitespace-nowrap">Options</span>
            <MoreHorizontal className="w-5 h-5 md:ml-2 shrink-0" />
          </Button>
        )}
      </div>
    </div>
  );
}
