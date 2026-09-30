"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { saveRootCog, createProjectAndMoveCog, moveCogToDestination } from "./actions";
import { createNewRootCog, createProjectAction } from "@/app/myCogs/newCog/actions";
import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";

import { CogActionRow } from "@/components/CogActionRow";
import { PublishCogmitModal, PublishState } from "@/components/PublishCogmitModal";

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

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishUrl, setPublishUrl] = useState<string>("");
  const [publishError, setPublishError] = useState<string>("");
  const [createdCogId, setCreatedCogId] = useState<string | null>(null);

  const handleSavePrivate = async () => {
    await submit(false);
  };

  const handlePublishPublic = async () => {
    if (!title) {
      setError("Title is required");
      return;
    }
    setError(null);
    setPublishModalOpen(true);
    setPublishState("publishing");
    setPublishError("");
    setPublishUrl("");
    setIsPending(true);

    try {
      let result;
      if (mode === "new") {
        result = await createNewRootCog(title, project || "No Parent Project", content, true);
        if (result.success) {
          setCreatedCogId(result.cogId || null);
        }
      } else {
        result = await saveRootCog(cogId!, title, project || "No Parent Project", content, true);
      }

      if (result.success) {
        const origin = window.location.origin;
        const publicUrl = `${origin}/cogmits/${result.author}/${result.cogmitId}/${result.slug}`;
        setPublishUrl(publicUrl);
        setPublishState("success");
      } else {
        setPublishError(result.error || "Failed to publish Cogmit");
        setPublishState("error");
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "An unexpected error occurred");
      setPublishState("error");
    } finally {
      setIsPending(false);
    }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
        actionRowContent={
          <CogActionRow
            mode="edit"
            project={project}
            projectEnabled={true}
            projects={projects}
            onMoveProject={async (name, isNew) => {
              if (mode === "new") {
                if (isNew) {
                  const res = await createProjectAction(name);
                  if (res.success) {
                    router.refresh();
                  }
                  return res;
                } else {
                  return { success: true };
                }
              } else {
                if (isNew) {
                  const res = await createProjectAndMoveCog(cogId!, name);
                  if (res.success) {
                    setProject(name);
                    router.refresh();
                  }
                  return res;
                } else {
                  const res = await moveCogToDestination(cogId!, name, isNew);
                  if (res.success) {
                    setProject(name);
                    router.refresh();
                  }
                  return res;
                }
              }
            }}
            shareEnabled={false}
            cogInEnabled={true}
            onCogIn={handleSavePrivate}
            isCogInPending={isPending}
            editCogEnabled={true}
            onEditCog={() => {}}
            cogmitEnabled={true}
            onCogmit={handlePublishPublic}
            optionsEnabled={mode === "existing" && !!cogId}
            cogId={cogId}
            deleteEnabled={mode === "existing"}
          />
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

      <PublishCogmitModal
        open={publishModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPublishModalOpen(false);
            if (publishState === "success") {
              if (mode === "new" && createdCogId) {
                router.push(`/myCogs/${createdCogId}/viewCog`);
              }
            }
          }
        }}
        state={publishState}
        publicUrl={publishUrl}
        errorMessage={publishError}
        onRetry={handlePublishPublic}
      />
    </>
  );
}
