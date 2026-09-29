import React from "react";
import { Button } from "@/components/ui/button";
import { Share, Save, Pencil, Megaphone, MoreHorizontal } from "lucide-react";
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
  onCogmit?: () => void;
  isCogmitPending?: boolean;
  
  // Options
  optionsEnabled: boolean;
  cogId?: string;
  deleteEnabled?: boolean;
}

export function CogActionRow({
  mode,
  project, projectEnabled, projects, onMoveProject,
  shareEnabled, onShare,
  cogInEnabled, onCogIn, isCogInPending,
  editCogEnabled, editUrl, onEditCog,
  cogmitEnabled, onCogmit, isCogmitPending,
  optionsEnabled, cogId, deleteEnabled
}: CogActionRowProps) {
  const commonHeightClass = "h-10";

  return (
    <div className="flex flex-col sm:flex-row w-full gap-2 items-center">
      {/* LEFT HALF (50%) */}
      <div className="flex w-full sm:w-1/2 gap-2 items-center">
        {/* First Action (25% overall) */}
        <div className="w-1/2">
          {mode === "view" ? (
            editUrl ? (
              <Link
                href={!editCogEnabled ? "#" : editUrl}
                className={cn(
                  "w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground", 
                  commonHeightClass,
                  !editCogEnabled && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
              >
                <Pencil className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">Edit Cog</span>
              </Link>
            ) : (
              <Button 
                variant="outline"
                className={cn("w-full truncate", commonHeightClass)}
                disabled={!editCogEnabled}
                onClick={onEditCog}
              >
                <Pencil className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">Edit Cog</span>
              </Button>
            )
          ) : (
            <Button 
              variant="secondary" 
              className={cn("w-full bg-[#4B0084] hover:bg-[#3A0066] text-white hover:text-white disabled:opacity-50 truncate", commonHeightClass)}
              disabled={!cogInEnabled || isCogInPending}
              onClick={onCogIn}
            >
              <Save className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">Cog In</span>
            </Button>
          )}
        </div>
        
        {/* Project (25% overall) */}
        <div className="w-1/2">
          <ProjectDisplay 
            project={project} 
            disabled={!projectEnabled} 
            projects={projects} 
            onSave={onMoveProject}
            className={cn("w-full", commonHeightClass)}
          />
        </div>
      </div>

      {/* RIGHT HALF (50%) */}
      <div className="flex w-full sm:w-1/2 gap-2 items-center">
        {/* Share (20% overall / 40% of right half) */}
        <div className="w-[40%]">
          <Button 
            variant="outline" 
            className={cn("w-full truncate", commonHeightClass)} 
            disabled={!shareEnabled}
            onClick={onShare}
          >
            <Share className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">Share</span>
          </Button>
        </div>

        {/* Cogmit (20% overall / 40% of right half) */}
        <div className="w-[40%]">
          <Button 
            className={cn("w-full bg-[#FFFF11] hover:bg-[#e6e60f] text-black truncate", commonHeightClass)}
            disabled={!cogmitEnabled || isCogmitPending}
            onClick={onCogmit}
          >
            <span className="truncate">Cogmit</span> <Megaphone className="w-4 h-4 ml-2 shrink-0" />
          </Button>
        </div>

        {/* Options (10% overall / 20% of right half) */}
        <div className="w-[20%]">
          {optionsEnabled && cogId ? (
            <CogOptionsModal cogId={cogId} className={cn("w-full", commonHeightClass)} deleteEnabled={deleteEnabled} />
          ) : (
            <Button 
              variant="outline" 
              className={cn("w-full px-0", commonHeightClass)}
              disabled
              aria-label="Cog options"
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
