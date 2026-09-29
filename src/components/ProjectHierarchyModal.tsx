"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectHierarchyModalProps {
  currentProject: string;
  projects: string[];
  onSave: (projectName: string, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

type Node = {
  name: string;
  fullPath: string;
  children: Record<string, Node>;
};

export function ProjectHierarchyModal({ currentProject, projects, onSave, className }: ProjectHierarchyModalProps) {
  const [open, setOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newProjectParent, setNewProjectParent] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedProject(null);
    setNewProjectParent(null);
    setNewProjectName("");
    setError(null);
  };

  const handleOpen = () => {
    resetState();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetState();
  };

  const handleSave = async () => {
    if (!selectedProject && !newProjectParent) {
      setError("Please select a destination project.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let destName = "";
      let isNew = false;
      
      if (newProjectParent !== null) {
        if (!newProjectName.trim()) {
          setError("Subproject name cannot be empty.");
          setIsSaving(false);
          return;
        }
        if (newProjectParent === "ROOT") {
          destName = newProjectName.trim();
        } else {
          destName = `${newProjectParent}/${newProjectName.trim()}`;
        }
        isNew = true;
      } else if (selectedProject) {
        destName = selectedProject;
      }

      if (destName === currentProject) {
        // No-op
        handleClose();
        setIsSaving(false);
        return;
      }

      const res = await onSave(destName, isNew);
      if (res.success) {
        handleClose();
      } else {
        setError(res.error || "Failed to move project.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Build tree
  const root: Node = { name: "ROOT", fullPath: "ROOT", children: {} };
  projects.forEach(p => {
    const parts = p.split("/");
    let current = root;
    let pathSoFar = "";
    parts.forEach((part, i) => {
      pathSoFar = i === 0 ? part : `${pathSoFar}/${part}`;
      if (!current.children[part]) {
        current.children[part] = { name: part, fullPath: pathSoFar, children: {} };
      }
      current = current.children[part];
    });
  });

  const renderNode = (node: Node, depth: number) => {
    const isExpanded = expanded[node.fullPath];
    const hasChildren = Object.keys(node.children).length > 0;
    const isSelected = selectedProject === node.fullPath;
    const isCurrent = currentProject === node.fullPath;
    const isAddingNew = newProjectParent === node.fullPath;

    const childrenNodes = Object.values(node.children);

    return (
      <div key={node.fullPath} className="flex flex-col w-full">
        <div 
          className={cn(
            "flex items-center group h-8 px-2 rounded-md cursor-pointer relative w-full border border-transparent hover:border-yellow-500 transition-colors",
            isSelected ? "border-yellow-500" : ""
          )}
          onClick={() => {
            setSelectedProject(node.fullPath);
            setNewProjectParent(null);
          }}
        >
          {isExpanded && (
            <div className="absolute top-[16px] bottom-0 left-[15px] w-px bg-border z-0" />
          )}
          <div 
            className="w-4 h-4 mr-1 flex items-center justify-center shrink-0 z-10 bg-background relative"
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                toggleExpand(node.fullPath);
              }
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />
            ) : <div className="w-1.5 h-1.5 rounded-full bg-border" />}
          </div>
          <span className="text-sm font-medium truncate flex-1 z-10 relative">
            {node.name}
            {isCurrent && <span className="ml-2 text-xs text-muted-foreground italic">(Current)</span>}
          </span>
          {isSelected && <Check className="w-4 h-4 text-primary ml-2 shrink-0 z-10 relative" />}
        </div>
        
        {isExpanded && (
          <div className="flex flex-col ml-2">
            {(() => {
              const items = [
                { type: 'new_sub' as const },
                ...childrenNodes.map(child => ({ type: 'child' as const, data: child }))
              ];

              return items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                  <div key={item.type === 'child' ? item.data.fullPath : 'new_sub'} className="relative pl-[22px]">
                    {isLast ? (
                      <div className="absolute top-0 h-[16px] left-[7px] w-px bg-border z-0" />
                    ) : (
                      <div className="absolute top-0 bottom-0 left-[7px] w-px bg-border z-0" />
                    )}
                    <div className="absolute top-[16px] left-[7px] w-[15px] h-px bg-border z-0" />
                    
                    {item.type === 'new_sub' ? (
                      !isAddingNew ? (
                         <div 
                           className="flex items-center h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-md border border-transparent hover:border-yellow-500 transition-colors z-10 relative w-full"
                           onClick={(e) => {
                             e.stopPropagation();
                             setNewProjectParent(node.fullPath);
                             setSelectedProject(null);
                             setNewProjectName("");
                           }}
                         >
                           <Plus className="w-3 h-3 mr-1 shrink-0 bg-background" /> <span className="truncate bg-background">New sub project</span>
                         </div>
                      ) : (
                        <div className="h-8 px-2 flex items-center z-10 relative w-full bg-background rounded-md border border-transparent">
                          <input
                            type="text"
                            autoFocus
                            placeholder="New sub project name"
                            className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )
                    ) : (
                      renderNode(item.data, depth + 1)
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Button variant="outline" className={cn("w-full truncate px-3 flex justify-between items-center", className || "h-10")} onClick={handleOpen}>
        <span className="truncate">{currentProject}</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
          <div 
            className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold">Move Cog</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col space-y-1">
                {/* No Parent Project option */}
                <div 
                  className={cn(
                    "flex items-center group h-8 px-2 rounded-md border border-transparent hover:border-yellow-500 transition-colors cursor-pointer",
                    selectedProject === "No Parent Project" ? "border-yellow-500" : ""
                  )}
                  onClick={() => {
                    setSelectedProject("No Parent Project");
                    setNewProjectParent(null);
                  }}
                >
                  <span className="text-sm font-medium flex-1 italic text-muted-foreground">No Parent Project</span>
                  {selectedProject === "No Parent Project" && <Check className="w-4 h-4 text-primary ml-2 shrink-0" />}
                </div>

                {/* Root level + New project */}
                {newProjectParent !== "ROOT" ? (
                  <div 
                    className="flex items-center h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-md border border-transparent hover:border-yellow-500 transition-colors"
                    onClick={() => {
                      setNewProjectParent("ROOT");
                      setSelectedProject(null);
                      setNewProjectName("");
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> New project
                  </div>
                ) : (
                  <div className="h-8 px-2 flex items-center rounded-md border border-transparent">
                    <input
                      type="text"
                      autoFocus
                      placeholder="New project name"
                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                )}

                <div className="my-2 border-t border-border" />

                {/* Hierarchy */}
                {Object.values(root.children).map(child => renderNode(child, 0))}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
