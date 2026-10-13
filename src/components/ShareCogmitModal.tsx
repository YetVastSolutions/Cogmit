"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Share2,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { extractExcerpt, formatTimestamp } from "@/lib/utils";
import {
  computeCardSourceHash,
  exportSvgToBlob,
  generateCardSvg,
  getCachedCard,
  setCachedCard,
  triggerImageDownload,
} from "@/lib/card-renderer";

interface ShareCogmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  authorId?: string;
  published?: string;
  description?: string;
  shareUrl: string;
  content?: string;
}

type ShareOption = "card" | "rich-link";

export function ShareCogmitModal({
  open,
  onOpenChange,
  title,
  authorId,
  published,
  description,
  shareUrl,
  content,
}: ShareCogmitModalProps) {
  const [selectedOption, setSelectedOption] = useState<ShareOption>("card");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canShareNative] = useState(() => {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  });

  // Authoritative excerpt up to 200 characters from RootCog content or description
  const excerpt = useMemo(() => {
    return extractExcerpt(content || description || "", 200, title);
  }, [content, description, title]);

  // Deterministic source hash for card caching
  const sourceHash = useMemo(() => {
    return computeCardSourceHash(title, excerpt, shareUrl, authorId);
  }, [title, excerpt, shareUrl, authorId]);

  const cacheKey = shareUrl || `${authorId || "anon"}_${title}`;

  // Deterministic SVG card markup with caching
  const cardSvg = useMemo(() => {
    if (!open) return "";

    // 1. Check in-memory card cache
    const cached = getCachedCard(cacheKey, sourceHash);
    if (cached) {
      return cached.svgString;
    }

    // 2. Generate deterministically if not cached or if source changed
    const generatedSvg = generateCardSvg({
      title,
      excerpt,
      url: shareUrl,
      authorId,
      published,
    });

    // 3. Store in cache
    setCachedCard(cacheKey, {
      cacheKey,
      sourceHash,
      excerpt,
      canonicalUrl: shareUrl,
      templateVersion: "1.0.0",
      svgString: generatedSvg,
    });

    return generatedSvg;
  }, [open, cacheKey, sourceHash, title, excerpt, shareUrl, authorId, published]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setCopiedLink(false);
        setCopiedImage(false);
        setCopyError(false);
        setIsExporting(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setCopyError(false);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 3000);
    }
  };

  const getOrGenerateCardBlob = async (): Promise<Blob> => {
    const cached = getCachedCard(cacheKey, sourceHash);
    if (cached?.blob) {
      return cached.blob;
    }

    const blob = await exportSvgToBlob(cardSvg);
    if (cached) {
      cached.blob = blob;
      setCachedCard(cacheKey, cached);
    }
    return blob;
  };

  const handleDownloadCard = async () => {
    if (!cardSvg) return;
    setIsExporting(true);
    try {
      const blob = await getOrGenerateCardBlob();
      const sanitizedName = (title || "cogmit-card")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 32);
      triggerImageDownload(blob, `${authorId ? `${authorId}-` : ""}${sanitizedName}.png`);
    } catch (err) {
      console.error("Failed to export Cognition Card image", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCardImage = async () => {
    if (!cardSvg || typeof ClipboardItem === "undefined") return;
    setIsExporting(true);
    try {
      const blob = await getOrGenerateCardBlob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setCopiedImage(true);
      window.setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      // Fallback to copying URL if image clipboard write is not supported by user's browser/permissions
      await handleCopyLink();
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!canShareNative || typeof navigator.share === "undefined") return;

    try {
      if (selectedOption === "card") {
        const blob = await getOrGenerateCardBlob();
        const file = new File([blob], "cogmit-card.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text: excerpt,
            url: shareUrl,
            files: [file],
          });
          return;
        }
      }

      await navigator.share({
        title,
        text: excerpt,
        url: shareUrl,
      });
    } catch {
      // Ignore user cancellation
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-cogmit-title"
    >
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 id="share-cogmit-title" className="text-lg font-semibold">
              Share Cogmit
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Public RootCog sharing options
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Option Selector */}
          <div className="grid grid-cols-2 p-1 bg-muted/80 rounded-lg border text-sm font-medium">
            <button
              type="button"
              onClick={() => setSelectedOption("card")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                selectedOption === "card"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Cognition Card</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("rich-link")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                selectedOption === "rich-link"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              <span>Rich Link</span>
            </button>
          </div>

          {/* Option A: Cogmit Card */}
          {selectedOption === "card" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Downloadable card image with up to 200 characters of RootCog text and canonical URL.
              </p>

              {/* Card Preview */}
              <div className="overflow-hidden rounded-lg border shadow-md bg-[#4B0084] aspect-[1200/630] flex items-center justify-center">
                {cardSvg ? (
                  <div
                    className="w-full h-full select-none"
                    dangerouslySetInnerHTML={{ __html: cardSvg }}
                  />
                ) : (
                  <div className="text-xs text-[#FFFF11]">Generating preview…</div>
                )}
              </div>

              {/* Excerpt Meta Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Deterministic export · Mobile-ready</span>
                <span className="font-mono">{excerpt.length} / 200 characters</span>
              </div>
            </div>
          )}

          {/* Option B: Cogmit Rich Link */}
          {selectedOption === "rich-link" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Canonical public URL with Open Graph and Twitter summary metadata (no image required).
              </p>

              {/* Rich Link Card Preview */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="text-xs text-muted-foreground font-medium">
                  {authorId ? `${authorId}'s Cogmit` : "Cogmit"}
                  {published && ` · ${formatTimestamp(published)}`}
                </div>

                <h3 className="font-semibold text-base break-words text-foreground">
                  {title}
                </h3>

                {excerpt ? (
                  <p className="text-sm text-muted-foreground break-words leading-relaxed">
                    {excerpt}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    (No content excerpt available)
                  </p>
                )}
              </div>

              {/* URL Display */}
              {shareUrl && (
                <div className="rounded-md border bg-muted/40 p-2.5">
                  <div className="break-all text-xs font-mono text-foreground/90">
                    {shareUrl}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Social crawler compatible</span>
                <span className="font-mono">{excerpt.length} / 200 characters</span>
              </div>
            </div>
          )}

          {copyError && (
            <p className="text-xs text-destructive">
              Failed to copy to clipboard. Please copy manually or use download.
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t px-5 py-3.5 bg-muted/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {selectedOption === "card" ? (
              <>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleDownloadCard}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting…" : "Download PNG"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCardImage}
                  disabled={isExporting}
                >
                  {copiedImage ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                      Copied Image!
                    </>
                  ) : (
                    <>
                      <Clipboard className="mr-2 h-4 w-4" />
                      Copy Image
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {shareUrl && (
                  <Button
                    type="button"
                    variant={copyError ? "destructive" : "default"}
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Clipboard className="mr-2 h-4 w-4" />
                        {copyError ? "Retry Copy" : "Copy Link"}
                      </>
                    )}
                  </Button>
                )}

                {shareUrl && (
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Cogmit
                  </a>
                )}
              </>
            )}

            {canShareNative && shareUrl && (
              <Button type="button" variant="outline" onClick={handleNativeShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            )}
          </div>

          <Button type="button" variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
