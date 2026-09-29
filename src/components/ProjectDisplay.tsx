import React from "react";
import { cn } from "@/lib/utils";
import { ProjectHierarchyModal } from "@/components/ProjectHierarchyModal";

interface ProjectDisplayProps {
  project: string;
  disabled?: boolean;
  projects?: string[];
  onSave?: (projectName: string, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

export function ProjectDisplay({ project, disabled = true, projects = [], onSave, className }: ProjectDisplayProps) {
  if (!disabled && onSave) {
    return (
      <ProjectHierarchyModal
        currentProject={project}
        projects={projects}
        onSave={onSave}
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed items-center truncate", className || "h-10")}>
      <span className="truncate">{project}</span>
    </div>
  );
}
