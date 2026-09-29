import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ProjectDropdownProps {
  project: string;
  setProject: (val: string) => void;
  projects: string[];
  onCreateProject: (projectName: string) => Promise<{ success: boolean; error?: string }>;
}

export function ProjectDropdown({ project, setProject, projects, onCreateProject }: ProjectDropdownProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  return (
    <>
      <Select
        value={project}
        onValueChange={(val) => {
          if (val === "__ADD_NEW__") {
            setIsProjectModalOpen(true);
          } else {
            setProject(val || "No Parent Project");
          }
        }}
      >
        <SelectTrigger className="w-full h-12 px-3">
          <SelectValue>{project}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="No Parent Project" className="h-12 pl-3">No Parent Project</SelectItem>
          <SelectItem value="__ADD_NEW__" className="h-12 pl-3">+Add to new project</SelectItem>
          {projects.length > 0 && <div className="h-px bg-border my-1 mx-2" />}
          {projects.map((p) => {
            const parts = p.split("/");
            const name = parts[parts.length - 1];
            const depth = parts.length - 1;
            return (
              <SelectItem key={p} value={p} className="h-12 pl-3">
                <div style={{ marginLeft: `${depth * 1}rem` }} className={depth > 0 ? "text-muted-foreground" : ""}>
                  {name}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6">Create New Project</h2>

            {projectError && (
              <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                {projectError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-foreground">
                Project name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                maxLength={57}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsProjectModalOpen(false)} disabled={isCreatingProject}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setProjectError(null);
                  setIsCreatingProject(true);
                  const res = await onCreateProject(newProjectName);
                  setIsCreatingProject(false);
                  if (res.success) {
                    setProject(newProjectName);
                    setIsProjectModalOpen(false);
                    setNewProjectName("");
                  } else {
                    setProjectError(res.error || "Unknown error");
                  }
                }}
                disabled={isCreatingProject}
              >
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
