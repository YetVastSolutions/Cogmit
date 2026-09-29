"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createNewRootCog, fetchProjectsList, createProjectAction } from "./actions";
import { ProjectDropdown } from "@/components/ProjectDropdown";

export default function NewCogPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("No Parent Project");
  const [content, setContent] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<string[]>([]);

  useEffect(() => {
    fetchProjectsList().then(setProjectsList).catch(console.error);
  }, []);

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
      const result = await createNewRootCog(title, project || "No Parent Project", content, isPublic);
      if (result.success) {
        router.push(`/myCogs/${result.cogId}/viewCog`);
      } else {
        setError(result.error || "Failed to create Cog");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col py-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto h-screen">
      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 mb-4 shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* ROW 1: Title + Cancel */}
        <div className="flex items-center gap-4 shrink-0">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cog Title (e.g., Project Atlas Architecture)"
            className="flex-1 h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
            maxLength={77}
          />
          <Button
            variant="outline"
            className="w-[20%] h-12 text-muted-foreground"
            onClick={() => router.push("/myCogs")}
            disabled={isPending}
            type="button"
          >
            Cancel
          </Button>
        </div>

        {/* ROW 2: Project + Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full shrink-0">
          {/* Column 1: Project */}
          <div className="w-full min-w-0">
            <div className="w-full min-w-0 flex items-center">
              <ProjectDropdown
                project={project}
                setProject={setProject}
                projects={projectsList}
                onCreateProject={async (name) => {
                  const res = await createProjectAction(name);
                  if (res.success) {
                    // refresh project list
                    const updated = await fetchProjectsList();
                    setProjectsList(updated);
                  }
                  return res;
                }}
              />
            </div>
          </div>

          {/* Column 2: Actions */}
          <div className="flex gap-4 w-full min-w-0">
            <Button
              className="flex-1 h-12 bg-[#4B0084] hover:bg-[#3A0066] text-white hover:text-white text-lg"
              variant="secondary"
              onClick={handleSavePrivate}
              disabled={isPending}
              type="button"
            >
              Save in Private
            </Button>
            <Button
              className="flex-1 h-12 bg-[#FFFF11] hover:bg-[#e6e60f] text-black text-lg"
              onClick={handlePublishPublic}
              disabled={isPending}
              type="button"
            >
              Publish
            </Button>
          </div>
        </div>

        {/* ROW 3: Content Editor */}
        <div className="flex-1 min-h-0 flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter Markdown or normal text..."
            className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
          />
        </div>
      </div>
    </div>
  );
}
