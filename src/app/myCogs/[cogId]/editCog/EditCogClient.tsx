"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveRootCog, createProjectAndMoveCog } from "./actions";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface EditCogClientProps {
  cogId: string;
  initialTitle: string;
  initialProject: string;
  initialContent: string;
  projects: string[];
  createdAt: string;
  lastModified: string;
}

export function EditCogClient({
  cogId,
  initialTitle,
  initialProject,
  initialContent,
  projects,
  createdAt,
  lastModified,
}: EditCogClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [project, setProject] = useState(initialProject);
  const [content, setContent] = useState(initialContent);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const handleSavePrivate = async () => {
    await submit(false);
  };

  const handlePublishPublic = async () => {
    await submit(true);
  };

  const submit = async (isPublic: boolean) => {
    if (!title) {
      setError("Title is required");
      return;
    }
    setError(null);
    setIsPending(true);

    try {
      const result = await saveRootCog(cogId, title, project || "No Parent Project", content, isPublic);
      if (result.success) {
        router.push(`/myCogs/${cogId}/viewCog`);
      } else {
        setError(result.error || "Failed to update Cog");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  const metadataContent = (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {createdAt && <span>Created: {new Date(createdAt).toLocaleString()}</span>}
      {lastModified && <span>Last modified: {new Date(lastModified).toLocaleString()}</span>}
    </div>
  );

  return (
    <>
      <CogWorkspaceShell
        titleContent={
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cog Title (e.g., Project Atlas Architecture)"
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
            maxLength={77}
          />
        }
        actionContent={
          <Button variant="outline" className="w-full" onClick={() => router.push(`/myCogs/${cogId}/viewCog`)}>
            Cancel
          </Button>
        }
        metadataContent={metadataContent}
        control1Content={
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
            <SelectTrigger className="w-full h-10">
              <SelectValue>{project}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No Parent Project">No Parent Project</SelectItem>
              <SelectItem value="__ADD_NEW__">+Add to new project</SelectItem>
              {projects.length > 0 && <div className="h-px bg-border my-1 mx-2" />}
              {projects.map((p) => {
                const parts = p.split("/");
                const name = parts[parts.length - 1];
                const depth = parts.length - 1;
                return (
                  <SelectItem key={p} value={p}>
                    <div style={{ marginLeft: `${depth * 1}rem` }} className={depth > 0 ? "text-muted-foreground" : ""}>
                      {name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        }
        control2Content={
          <Select disabled value="versions">
            <SelectTrigger className="w-full h-10 disabled:opacity-50">
              <SelectValue placeholder="Versions" />
            </SelectTrigger>
          </Select>
        }
        control3Content={
          <Button 
            className="w-full" 
            variant="secondary" 
            onClick={handleSavePrivate} 
            disabled={isPending}
          >
            Save in Private
          </Button>
        }
        control4Content={
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handlePublishPublic} 
            disabled={isPending}
          >
            Publish to Public
          </Button>
        }
      >
        {error && (
          <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 mb-4 shrink-0">
            {error}
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter Markdown or normal text..."
          className="w-full min-h-[400px] h-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
        />
      </CogWorkspaceShell>

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
                  const res = await createProjectAndMoveCog(cogId, newProjectName);
                  setIsCreatingProject(false);
                  if (res.success) {
                    setProject(newProjectName);
                    setIsProjectModalOpen(false);
                    setNewProjectName("");
                    router.refresh();
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
