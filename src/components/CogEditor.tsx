"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function CogEditor({
  initialContent,
  saveAction,
}: {
  initialContent: string;
  saveAction: (content: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"Idle" | "Editing" | "Saving" | "Saved" | "Error">("Idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (status !== "Editing") {
      setStatus("Editing");
    }
  };

  const handleSave = () => {
    setStatus("Saving");
    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await saveAction(content);
        if (result.success) {
          setStatus("Saved");
        } else {
          setStatus("Error");
          setErrorMessage(result.error || "An unknown error occurred.");
        }
      } catch (err) {
        setStatus("Error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center bg-muted p-3 rounded-md border border-border">
        <span className="text-sm font-medium">
          Status:{" "}
          <span
            className={
              status === "Saved"
                ? "text-green-600 dark:text-green-400"
                : status === "Error"
                ? "text-red-600 dark:text-red-400"
                : status === "Saving"
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-foreground"
            }
          >
            {status}
          </span>
        </span>
        {status === "Error" && (
          <span className="text-xs text-red-500">{errorMessage}</span>
        )}
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        disabled={isPending}
        className="w-full h-96 p-4 border border-border rounded-md bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        placeholder="Write your Markdown cognition here..."
      />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={status === "Idle" || status === "Saved" || isPending}
          size="lg"
        >
          {isPending ? "Saving..." : "Save Content"}
        </Button>
      </div>
    </div>
  );
}
