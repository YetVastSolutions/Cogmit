"use client";

import React, { useEffect, useState } from "react";
import { Clipboard, ExternalLink, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";

interface ShareCogmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  authorId?: string;
  published?: string;
  description?: string;
  shareUrl: string;
}

export function ShareCogmitModal({
  open,
  onOpenChange,
  title,
  authorId,
  published,
  description,
  shareUrl,
}: ShareCogmitModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setCopied(false);
        setCopyError(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      window.setTimeout(() => {
        setCopyError(false);
      }, 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-cogmit-title"
    >
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="share-cogmit-title" className="text-lg font-semibold">
            Share Cogmit
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Anyone with this link can view the published Cogmit.
          </p>

          <div className="rounded-md border p-4 space-y-2 bg-muted/20">
            <div className="text-xs text-muted-foreground">
              {authorId ? `${authorId}'s Cogmit` : "Cogmit"}
              {published && ` · ${formatTimestamp(published)}`}
            </div>
            
            <h3 className="font-semibold text-base break-words">{title}</h3>
            
            {description && (
              <p className="text-sm text-muted-foreground break-words">
                {description.length > 157 ? `${description.slice(0, 156)}…` : description}
              </p>
            )}
          </div>

          {shareUrl && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="break-all text-sm">{shareUrl}</div>
            </div>
          )}

          {copyError && (
            <p className="text-sm text-destructive">
              Failed to copy to clipboard. Please copy the URL manually.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {shareUrl && (
              <Button type="button" variant={copyError ? "destructive" : "outline"} onClick={handleCopy}>
                <Clipboard className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : copyError ? "Retry Copy" : "Copy Link"}
              </Button>
            )}

            {shareUrl && (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "default" })}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Cogmit
              </a>
            )}

            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
