"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, X, History, Trash2 } from "lucide-react";
import { HistoryModal } from "@/app/myCogs/[cogId]/editCog/HistoryModal";
import { DeleteCogButton } from "@/components/DeleteCogButton";
import { cn } from "@/lib/utils";

interface CogOptionsModalProps {
  cogId: string;
  className?: string;
  deleteEnabled?: boolean;
}

export function CogOptionsModal({ cogId, className, deleteEnabled = true }: CogOptionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className={cn("shrink-0 px-3", className)}
        aria-label="Cog options"
        onClick={() => setIsOpen(true)}
      >
        <MoreHorizontal className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div 
            className="bg-background border border-border rounded-lg shadow-lg w-full max-w-sm p-6 relative flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Cog Options</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <HistoryModal cogId={cogId} className="w-full justify-start h-10 px-4" />
            
            <DeleteCogButton cogId={cogId} className="w-full justify-start h-10 px-4" disabled={!deleteEnabled}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Cog
            </DeleteCogButton>

            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
