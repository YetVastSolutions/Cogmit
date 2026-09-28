"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createNewRootCog } from "./actions";

export default function NewCogPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [content, setContent] = useState("");
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
      <header className="mb-8 border-b border-border pb-4 shrink-0">
        <h1 className="text-3xl font-bold text-primary">Create a New RootCog</h1>
        <p className="text-muted-foreground">Start a new thread of cognition</p>
      </header>

      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 mb-4 shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* ROW 1: Title */}
        <div className="flex flex-col gap-2 shrink-0">
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
        </div>

        {/* ROW 2: Project, Save, Publish */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-[30%]">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No Parent Project</option>
              {/* Other projects would be mapped here in a real implementation */}
            </select>
          </div>
          <Button 
            className="w-[40%]" 
            variant="secondary" 
            onClick={handleSavePrivate} 
            disabled={isPending}
          >
            Save in Private
          </Button>
          <Button 
            className="w-[30%] bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handlePublishPublic} 
            disabled={isPending}
          >
            Publish to Public
          </Button>
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
