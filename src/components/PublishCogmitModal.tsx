"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Circle, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PublishState = "idle" | "publishing" | "success" | "error";

interface PublishCogmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PublishState;
  publicUrl?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PublishCogmitModal({
  open,
  onOpenChange,
  state,
  publicUrl,
  errorMessage,
  onRetry
}: PublishCogmitModalProps) {
  const [copied, setCopied] = useState(false);
  const [clipboardError, setClipboardError] = useState(false);

  useEffect(() => {
    if (state === "success" && publicUrl) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setCopied(true);
        setClipboardError(false);
      }).catch(() => {
        setClipboardError(true);
      });
    }
  }, [state, publicUrl]);

  if (!open) return null;

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setCopied(true);
        setClipboardError(false);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        setClipboardError(true);
      });
    }
  };

  const preventClose = state === "publishing";
  const handleClose = () => {
    if (!preventClose) {
      onOpenChange(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div 
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {!preventClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <h2 className="text-xl font-semibold mb-6">
          {state === "idle" || state === "publishing" ? "Publish Cogmit" : 
           state === "success" ? "Cogmit Published" : 
           "Unable to publish Cogmit"}
        </h2>
        
        {state === "publishing" && (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">Preparing your Cogmit...</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Save publication</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Circle className="w-5 h-5" />
                <span>Generate share link</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Circle className="w-5 h-5" />
                <span>Copy share link</span>
              </li>
            </ul>
          </div>
        )}

        {state === "success" && publicUrl && (
          <div className="space-y-6">
            <p className="text-muted-foreground">Your Cogmit is now publicly shareable.</p>
            
            <div className="p-3 bg-muted rounded-md text-sm font-mono break-all border border-border">
              {publicUrl}
            </div>

            <div className="flex items-center text-sm font-medium h-6">
              {copied ? (
                <span className="text-green-600 dark:text-green-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Link copied to clipboard
                </span>
              ) : clipboardError ? (
                <span className="text-muted-foreground">Copy the link below to share your Cogmit.</span>
              ) : null}
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={handleCopy}>
                Copy Link
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-6">
            <p className="text-destructive">
              {errorMessage || "The Cogmit could not be published."}
            </p>
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={onRetry}>
                Try Again
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
