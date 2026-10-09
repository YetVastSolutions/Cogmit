"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clipboard,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export type PublishState = "idle" | "publishing" | "success" | "error";

export type PublishStepStatus =
  | "pending"
  | "active"
  | "completed"
  | "error";

export interface PublishStep {
  id: string;
  label: string;
  status: PublishStepStatus;
}

interface PublishCogmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PublishState;
  activeStep?: string;
  steps?: PublishStep[];
  publicUrl?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PublishCogmitModal({
  open,
  onOpenChange,
  state,
  activeStep,
  steps = [],
  publicUrl,
  errorMessage,
  onRetry,
}: PublishCogmitModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setCopied(false), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const preventClose = state === "publishing";

  const resolvedActiveStep =
    activeStep ||
    steps.find((step) => step.status === "active")?.id;

  const handleClose = () => {
    if (preventClose) return;
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-cogmit-title"
    >
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2
            id="publish-cogmit-title"
            className="text-lg font-semibold"
          >
            {state === "success"
              ? "Cogmit Published"
              : state === "error"
                ? "Publication Failed"
                : "Publishing Cogmit"}
            {state === "publishing" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait…
              </div>
            )}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={preventClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {(state === "publishing" ||
            state === "error" ||
            state === "success") &&
            steps.length > 0 && (
              <ul className="space-y-3">
                {steps.map((step) => {
                  const isActive =
                    step.id === resolvedActiveStep &&
                    step.status === "active";

                  const isError = step.status === "error";
                  const isCompleted = step.status === "completed";

                  return (
                    <li
                      key={step.id}
                      className="flex items-center gap-3"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                      ) : isError ? (
                        <X className="h-5 w-5 shrink-0 text-destructive" />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}

                      <span
                        className={
                          isError ? "text-destructive" : ""
                        }
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}



          {state === "success" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Cogmit has been published successfully.
              </p>

              {publicUrl && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="break-all text-sm">
                    {publicUrl}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {publicUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    {copied ? "Copied" : "Copy URL"}
                  </Button>
                )}

                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "default" })}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Cogmit
                  </a>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">
                  {errorMessage ||
                    "An unexpected error occurred while publishing the Cogmit."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={onRetry}
                  disabled={!onRetry}
                >
                  Try Again
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}