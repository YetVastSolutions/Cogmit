"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  saveRootCog,
  createProjectAndMoveCog,
  moveCogToDestination,
} from "./actions";

import {
  createNewRootCog,
  createProjectAction,
} from "@/app/myCogs/newCog/actions";

import {
  writePublishedCogmitMarkdown,
  updateCogmitsIndex,
  updateSourceCogsIndexStatus,
} from "@/lib/publish-actions";

import { CogWorkspaceShell } from "@/components/CogWorkspaceShell";
import { formatTimestamp } from "@/lib/utils";

import { extractDescription, getCanonicalCogmitUrl } from "@/lib/utils";

import { CogActionRow } from "@/components/CogActionRow";
import { MarqueeContent } from "@/components/MarqueeContent";

import {
  PublishCogmitModal,
  PublishState,
  PublishStep,
} from "@/components/PublishCogmitModal";

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
  published?: string;
}



type PublishedCogmit =
  Awaited<
    ReturnType<typeof writePublishedCogmitMarkdown>
  >;

interface PublishContext {
  savedCogId: string;
  publishedCogmit?: PublishedCogmit;
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
  published,
}: EditCogClientProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState(initialTitle);

  const [project, setProject] =
    useState(initialProject);

  const [content, setContent] =
    useState(initialContent);

  const [isPending, setIsPending] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isDirty =
    title !== initialTitle ||
    project !== initialProject ||
    content !== initialContent;

  const [publishModalOpen, setPublishModalOpen] =
    useState(false);

  const [publishState, setPublishState] =
    useState<PublishState>("idle");

  const [publishSteps, setPublishSteps] =
    useState<PublishStep[]>([]);

  const [publishUrl, setPublishUrl] =
    useState("");

  const [publishError, setPublishError] =
    useState("");

  const [createdCogId, setCreatedCogId] =
    useState<string | null>(null);

  const publishContextRef =
    useRef<PublishContext | null>(null);

  const handleSavePrivate = async () => {
    await submit(false);
  };

  const updateStep = (
    id: string,
    status: PublishStep["status"]
  ) => {
    setPublishSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
            ...step,
            status,
          }
          : step
      )
    );
  };

  const addOrUpdateSteps = (
    newSteps: PublishStep[]
  ) => {
    setPublishSteps((prev) => {
      const existingIds = new Set(
        prev.map((step) => step.id)
      );

      return [
        ...prev,
        ...newSteps.filter(
          (step) =>
            !existingIds.has(step.id)
        ),
      ];
    });
  };

  const handlePublishPublic = async () => {
    console.log("[COGMIT_DEBUG] button clicked");
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setError(null);

    setPublishModalOpen(true);
    setPublishState("publishing");
    setPublishError("");
    setPublishUrl("");
    setIsPending(true);

    const isResume =
      publishContextRef.current !== null;

    let currentStepId: string | null =
      null;

    if (!isResume) {
      setPublishSteps([
        {
          id: "prep",
          label: "Preparing Cog",
          status: "active",
        },
        {
          id: "publish_markdown",
          label: "Creating published Cogmit",
          status: "pending",
        },
        {
          id: "update_index",
          label: "Updating cogsIndex.json",
          status: "pending",
        },
        {
          id: "update_source",
          label: "Updating publication state",
          status: "pending",
        },
      ]);
    }

    const setActiveStep = (
      id: string
    ) => {
      currentStepId = id;

      setPublishSteps((prev) =>
        prev.map((step) =>
          step.id === id
            ? {
              ...step,
              status: "active",
            }
            : step.status === "active"
              ? {
                ...step,
                status: "pending",
              }
              : step
        )
      );
    };

    try {
      let publishContext =
        publishContextRef.current;

      /*
       * PREP
       *
       * This is deliberately stored in a ref.
       * Retry must not create another RootCog.
       */
      if (!publishContext) {
        setActiveStep("prep");

        let savedCogId = cogId;

        if (mode === "new") {
          const result =
            await createNewRootCog(
              title,
              project ||
              "No Parent Project",
              content,
              false
            );

          if (
            !result.success ||
            !result.cogId
          ) {
            throw new Error(
              result.error ||
              "Failed to create Cog"
            );
          }

          savedCogId = result.cogId;

          setCreatedCogId(
            result.cogId
          );
        } else {
          if (!savedCogId) {
            throw new Error(
              "Cog ID is missing"
            );
          }

          const result =
            await saveRootCog(
              savedCogId,
              title,
              project ||
              "No Parent Project",
              content,
              false
            );

          if (!result.success) {
            throw new Error(
              result.error ||
              "Failed to save Cog"
            );
          }
        }

        if (!savedCogId) {
          throw new Error(
            "Cog ID is missing after save"
          );
        }

        publishContext = {
          savedCogId,
        };

        publishContextRef.current =
          publishContext;

        updateStep(
          "prep",
          "completed"
        );
      } else if (
        mode === "new"
      ) {
        setCreatedCogId(
          publishContext.savedCogId
        );
      }

      const savedCogId =
        publishContext.savedCogId;





      /*
       * PUBLISHED MARKDOWN
       *
       * Once this succeeds, retain its exact result.
       * Retry never generates another publication artifact
       * during the same publication attempt.
       */
      if (!publishContext.publishedCogmit) {
        setActiveStep("publish_markdown");

        const description = extractDescription(content);

        publishContext.publishedCogmit =
          await writePublishedCogmitMarkdown(
            savedCogId,
            title,
            description,
            content
          );

        publishContextRef.current = publishContext;

        updateStep(
          "publish_markdown",
          "completed"
        );
      } else {
        updateStep(
          "publish_markdown",
          "completed"
        );
      }

      const pubResult =
        publishContext.publishedCogmit;

      if (!pubResult) {
        throw new Error(
          "Published Cogmit result is unavailable"
        );
      }

      /*
       * PUBLIC INDEX
       */
      const updateIndexStep =
        publishSteps.find(
          (step) =>
            step.id ===
            "update_index"
        );

      if (
        !updateIndexStep ||
        updateIndexStep.status !==
        "completed"
      ) {
        setActiveStep(
          "update_index"
        );

        await updateCogmitsIndex(
          savedCogId,
          title,
          extractDescription(content),
          pubResult.cogmitId,
          pubResult.targetPath
        );

        updateStep(
          "update_index",
          "completed"
        );
      }

      /*
       * SOURCE COG INDEX
       */
      const updateSourceStep =
        publishSteps.find(
          (step) =>
            step.id ===
            "update_source"
        );

      if (
        !updateSourceStep ||
        updateSourceStep.status !==
        "completed"
      ) {
        setActiveStep(
          "update_source"
        );

        await updateSourceCogsIndexStatus(
          savedCogId,
          pubResult.cogmitId
        );

        updateStep(
          "update_source",
          "completed"
        );
      }

      const origin =
        window.location.origin;

      const publicUrl = getCanonicalCogmitUrl(
        origin,
        pubResult.author,
        pubResult.cogmitId
      );

      setPublishUrl(
        publicUrl
      );

      setPublishState(
        "success"
      );
    } catch (err) {
      if (currentStepId) {
        updateStep(
          currentStepId,
          "error"
        );
      }

      setPublishError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred"
      );

      setPublishState(
        "error"
      );
    } finally {
      setIsPending(false);
    }
  };

  const submit = async (
    isPublic: boolean
  ) => {
    if (!title) {
      setError(
        "Title is required"
      );
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      let result;

      if (mode === "new") {
        result =
          await createNewRootCog(
            title,
            project ||
            "No Parent Project",
            content,
            isPublic
          );

        if (result.success) {
          router.push(
            `/myCogs/${result.cogId}/viewCog`
          );
        } else {
          setError(
            result.error ||
            "Failed to create Cog"
          );
        }
      } else {
        result =
          await saveRootCog(
            cogId!,
            title,
            project ||
            "No Parent Project",
            content,
            isPublic
          );

        if (result.success) {
          router.push(
            `/myCogs/${cogId}/viewCog`
          );
        } else {
          setError(
            result.error ||
            "Failed to update Cog"
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred"
      );
    } finally {
      setIsPending(false);
    }
  };

  const isPublished = !!published;
  
  const staticItems = [
    <span key="published" className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium text-black ${isPublished ? "bg-[#FFFF11]" : "bg-green-500"}`}>
      {isPublished ? `Published ${formatTimestamp(published)}` : "Not published"}
    </span>
  ];

  const marqueeItems = [
    lastModified ? (
      <span key="2">Cog last modified: {formatTimestamp(lastModified)}</span>
    ) : null,
    createdAt ? (
      <span key="3">Cog created: {formatTimestamp(createdAt)}</span>
    ) : null,
  ].filter(Boolean) as React.ReactNode[];

  const metadataContent =
    mode === "existing" ? (
      <MarqueeContent 
        staticItems={staticItems}
        items={marqueeItems} 
      />
    ) : null;

  return (
    <>
      <CogWorkspaceShell
        titleContent={
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="Cog Title (e.g., Project Atlas Architecture)"
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
            maxLength={77}
          />
        }
        actionContent={
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (
                mode === "new"
              ) {
                router.push(
                  "/myCogs"
                );
              } else {
                router.push(
                  `/myCogs/${cogId}/viewCog`
                );
              }
            }}
          >
            Cancel
          </Button>
        }
        metadataContent={
          metadataContent
        }
        actionRowContent={
          <CogActionRow
            mode="edit"
            project={project}
            projectEnabled={true}
            projects={projects}
            onMoveProject={async (
              name,
              isNew
            ) => {
              if (
                mode === "new"
              ) {
                if (isNew) {
                  const res =
                    await createProjectAction(
                      name
                    );

                  if (
                    res.success
                  ) {
                    router.refresh();
                  }

                  return res;
                }

                return {
                  success: true,
                };
              }

              if (isNew) {
                const res =
                  await createProjectAndMoveCog(
                    cogId!,
                    name
                  );

                if (
                  res.success
                ) {
                  setProject(
                    name
                  );

                  router.refresh();
                }

                return res;
              }

              const res =
                await moveCogToDestination(
                  cogId!,
                  name,
                  isNew
                );

              if (
                res.success
              ) {
                setProject(
                  name
                );

                router.refresh();
              }

              return res;
            }}
            shareEnabled={false}
            cogInEnabled={isDirty}
            onCogIn={
              handleSavePrivate
            }
            isCogInPending={
              isPending
            }
            editCogEnabled={true}
            onEditCog={() => { }}
            cogmitEnabled={true}
            isCogmitPending={isPending}
            onCogmit={
              handlePublishPublic
            }
            optionsEnabled={
              mode ===
              "existing" &&
              !!cogId
            }
            cogId={cogId}
            deleteEnabled={
              mode === "existing"
            }
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
          onChange={(e) =>
            setContent(
              e.target.value
            )
          }
          placeholder="Enter Markdown or normal text..."
          className="w-full min-h-[400px] h-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
        />
      </CogWorkspaceShell>

      <PublishCogmitModal
        open={publishModalOpen}
        onOpenChange={(
          open
        ) => {
          if (open) {
            setPublishModalOpen(
              true
            );

            return;
          }

          setPublishModalOpen(
            false
          );

          if (
            publishState ===
            "success"
          ) {
            const targetCogId =
              createdCogId ||
              cogId;

            publishContextRef.current =
              null;

            if (targetCogId) {
              router.push(
                `/myCogs/${targetCogId}/viewCog`
              );
            }
          }
        }}
        state={
          publishState
        }
        steps={
          publishSteps
        }
        publicUrl={
          publishUrl
        }
        errorMessage={
          publishError
        }
        onRetry={
          handlePublishPublic
        }
      />
    </>
  );
}