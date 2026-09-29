"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveRootCog, createProjectAndMoveCog } from "./actions";
import { createNewRootCog, createProjectAction } from "@/app/myCogs/newCog/actions";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { DeleteCogButton } from "@/components/DeleteCogButton";

export type EditCogMode = "new" | "existing";

interface EditCogClientProps {
  mode: EditCogMode;
  cogId?: string;
  initialTitle: string;
  initialProject: string;
  initialContent: string;
  projects: string[];
  createdAt?: string;
  lastModified?: string;
}

export function EditCogClient({
  mode,
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
      let result;
      if (mode === "new") {
        result = await createNewRootCog(title, project || "No Parent Project", content, isPublic);
        if (result.success) {
          router.push(`/myCogs/${result.cogId}/viewCog`);
        } else {
          setError(result.error || "Failed to create Cog");
        }
      } else {
        result = await saveRootCog(cogId!, title, project || "No Parent Project", content, isPublic);
        if (result.success) {
          router.push(`/myCogs/${cogId}/viewCog`);
        } else {
          setError(result.error || "Failed to update Cog");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  const metadataContent = mode === "existing" ? (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {createdAt && <span>Created: {new Date(createdAt).toLocaleString()}</span>}
      {lastModified && <span>Last modified: {new Date(lastModified).toLocaleString()}</span>}
    </div>
  ) : null;

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
          <Button variant="outline" className="w-full" onClick={() => {
            if (mode === "new") {
              router.push("/myCogs");
            } else {
              router.push(`/myCogs/${cogId}/viewCog`);
            }
          }}>
            Cancel
          </Button>
        }
        metadataContent={metadataContent}
        control1Content={
          <ProjectDropdown 
            project={project}
            setProject={setProject}
            projects={projects}
            onCreateProject={async (name) => {
              if (mode === "new") {
                const res = await createProjectAction(name);
                if (res.success) {
                  router.refresh();
                }
                return res;
              } else {
                const res = await createProjectAndMoveCog(cogId!, name);
                if (res.success) {
                  router.refresh();
                }
                return res;
              }
            }}
          />
        }
        control2Content={
          mode === "existing" ? (
            <Select disabled value="versions">
              <SelectTrigger className="w-full h-10 disabled:opacity-50">
                <SelectValue placeholder="Versions" />
              </SelectTrigger>
            </Select>
          ) : null
        }
        control3Content={
          <Button 
            className="w-full bg-[#4B0084] hover:bg-[#3A0066] text-white hover:text-white" 
            variant="secondary" 
            onClick={handleSavePrivate} 
            disabled={isPending}
          >
            Save in Private
          </Button>
        }
        control4Content={
          <div className="flex w-full gap-2 min-w-0">
            <Button 
              className={mode === "new" ? "w-full bg-[#FFFF11] hover:bg-[#e6e60f] text-black shrink-0" : "w-[75%] bg-[#FFFF11] hover:bg-[#e6e60f] text-black shrink-0"}
              onClick={handlePublishPublic} 
              disabled={isPending}
            >
              Publish
            </Button>
            {mode === "existing" && cogId && <DeleteCogButton cogId={cogId} disabled={isPending} />}
          </div>
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

    </>
  );
}
