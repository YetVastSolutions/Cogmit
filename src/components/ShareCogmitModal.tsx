"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  Link as LinkIcon,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import {
  CARD_DESCRIPTION_MAX,
  MAX_ROOTCOG_TITLE_LENGTH,
  TEMPLATE_VERSION,
  computeCardSourceHash,
  exportSvgToBlob,
  generateCardSvg,
  getCachedCard,
  getCardDimensions,
  setCachedCard,
  triggerImageDownload,
} from "@/lib/card-renderer";
import { extractExcerpt } from "@/lib/excerpt";

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

/**
 * Clickable selection button used in the card configuration row.
 * Outlined with purple (#4B0084) when disabled, purple background when enabled.
 */
function SelectionButton({
  id,
  selected,
  onClick,
  children,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={selected}
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 border transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
        selected
          ? "bg-[#4B0084] border-[#4B0084] text-white hover:brightness-110 shadow-sm"
          : "bg-transparent border-[#4B0084] text-foreground hover:bg-[#4B0084]/15"
      }`}
    >
      {children}
    </button>
  );
}

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
  // Card generation options — defaults: withDescription=OFF, darkTheme=ON
  const [withDescription, setWithDescription] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);

  // Whether the user has clicked "Generate Cogmit Card" in this session
  const [cardGenerated, setCardGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canShareNative] = useState(() => {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  });

  // Description excerpt up to CARD_DESCRIPTION_MAX (597) chars for Cogmit Card rendering
  const excerpt = useMemo(() => {
    return extractExcerpt(content || description || "", CARD_DESCRIPTION_MAX, title);
  }, [content, description, title]);

  // Truncate title to MAX_ROOTCOG_TITLE_LENGTH (147 chars) without appending ChildCog or body content
  const truncatedTitle = useMemo(() => {
    return (title || "").slice(0, MAX_ROOTCOG_TITLE_LENGTH);
  }, [title]);

  // Generated sharing text format: Cogmit | <username>: <cogmit title>
  const sharingText = useMemo(() => {
    const username = authorId || "user";
    return `Cogmit | ${username}: ${truncatedTitle}`;
  }, [authorId, truncatedTitle]);

  // Deterministic source hash — includes both option flags
  const sourceHash = useMemo(() => {
    return computeCardSourceHash(title, excerpt, shareUrl, authorId, TEMPLATE_VERSION, withDescription, darkTheme);
  }, [title, excerpt, shareUrl, authorId, withDescription, darkTheme]);

  // Cache key includes options so each combination is independently cached
  const cacheKey = `${shareUrl || `${authorId || "anon"}_${title}`}|desc:${withDescription}|dark:${darkTheme}`;

  // Only generate the SVG once the user clicks "Generate Cogmit Card"
  const cardSvg = useMemo(() => {
    if (!open || !cardGenerated) return "";

    const cached = getCachedCard(cacheKey, sourceHash);
    if (cached) return cached.svgString;

    try {
      const generatedSvg = generateCardSvg({
        title: title.slice(0, MAX_ROOTCOG_TITLE_LENGTH),
        excerpt,
        url: shareUrl,
        authorId,
        published,
        withDescription,
        darkTheme,
      });

      setCachedCard(cacheKey, {
        cacheKey,
        sourceHash,
        excerpt,
        canonicalUrl: shareUrl,
        templateVersion: TEMPLATE_VERSION,
        svgString: generatedSvg,
      });

      return generatedSvg;
    } catch (err) {
      console.error("Failed to generate card SVG:", err);
      return "";
    }
  }, [open, cardGenerated, cacheKey, sourceHash, title, excerpt, shareUrl, authorId, published, withDescription, darkTheme]);

  // Convert generated SVG to previewable image data URL
  const previewUrl = useMemo(() => {
    if (!cardSvg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardSvg)}`;
  }, [cardSvg]);

  // Reset imageError when cardSvg changes (React recommended pattern avoiding cascading render effect)
  const [prevCardSvg, setPrevCardSvg] = useState(cardSvg);
  if (prevCardSvg !== cardSvg) {
    setPrevCardSvg(cardSvg);
    setImageError(false);
  }

  // Card dimensions derived from options and text metrics
  const cardDimensions = useMemo(() => {
    return getCardDimensions(withDescription, { title, excerpt });
  }, [withDescription, title, excerpt]);

  // Reset all session state whenever the modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setWithDescription(false);
        setDarkTheme(true);
        setCardGenerated(false);
        setIsGenerating(false);
        setGenerationError(null);
        setImageError(false);
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

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    setImageError(false);

    try {
      const generatedSvg = generateCardSvg({
        title: title.slice(0, MAX_ROOTCOG_TITLE_LENGTH),
        excerpt,
        url: shareUrl,
        authorId,
        published,
        withDescription,
        darkTheme,
      });

      if (!generatedSvg || typeof generatedSvg !== "string") {
        throw new Error("Card generation produced invalid SVG");
      }

      setCachedCard(cacheKey, {
        cacheKey,
        sourceHash,
        excerpt,
        canonicalUrl: shareUrl,
        templateVersion: TEMPLATE_VERSION,
        svgString: generatedSvg,
      });

      setCardGenerated(true);
    } catch (err) {
      console.error("Failed to generate Cogmit Card:", err);
      const msg = err instanceof Error ? err.message : "Failed to generate card";
      setGenerationError(msg);
      setCardGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-generate (reset) whenever options change after a card has been generated
  const handleWithDescriptionChange = (v: boolean) => {
    setWithDescription(v);
    setCardGenerated(false);
    setGenerationError(null);
  };

  const handleDarkThemeChange = (v: boolean) => {
    setDarkTheme(v);
    setCardGenerated(false);
    setGenerationError(null);
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

    const blob = await exportSvgToBlob(cardSvg, cardDimensions.width, cardDimensions.height);
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
      console.error("Failed to export Cogmit Card image", err);
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
      // Fallback to copying URL if image clipboard write is not supported
      await handleCopyLink();
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!canShareNative || typeof navigator.share === "undefined") return;

    try {
      if (cardGenerated && cardSvg) {
        const blob = await getOrGenerateCardBlob();
        const file = new File([blob], "cogmit-card.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: sharingText,
            text: sharingText,
            url: shareUrl,
            files: [file],
          });
          return;
        }
      }

      await navigator.share({
        title: sharingText,
        text: sharingText,
        url: shareUrl,
      });
    } catch {
      // Ignore user cancellation
    }
  };

  const handleShare = async () => {
    if (canShareNative && typeof navigator.share === "function") {
      await handleNativeShare();
    } else {
      await handleCopyLink();
    }
  };

  const previewBg = darkTheme ? "bg-black" : "bg-[#F8F5FA]";

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
          <h2 id="share-cogmit-title" className="text-lg font-semibold">
            Share Cogmit
          </h2>

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
          {/* Canonical Cogmit URL Component */}
          {shareUrl && (
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <div className="break-all font-mono text-xs text-foreground/90 select-all">
                {shareUrl}
              </div>
            </div>
          )}

          {/* Sharing Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Copy Link */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={!shareUrl}
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  Copied Link!
                </>
              ) : (
                <>
                  <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                  {copyError ? "Retry Copy" : "Copy Link"}
                </>
              )}
            </Button>

            {/* 2. Share */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={!shareUrl || isExporting}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>

            {/* 3. Copy Card */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCardImage}
              disabled={!cardGenerated || isExporting || !cardSvg}
            >
              {copiedImage ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  Copied Card!
                </>
              ) : (
                <>
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  Copy Card
                </>
              )}
            </Button>
          </div>

          {copyError && (
            <p className="text-xs text-destructive">
              Failed to copy to clipboard. Please copy manually or use download.
            </p>
          )}

          {/* Generation Error Alert */}
          {generationError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between gap-2">
              <span>{generationError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-destructive/40 hover:bg-destructive/20"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Configuration and Primary Card Action */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!cardGenerated ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <SelectionButton
                    id="toggle-with-description"
                    selected={withDescription}
                    onClick={() => handleWithDescriptionChange(!withDescription)}
                  >
                    With description
                  </SelectionButton>
                  <SelectionButton
                    id="toggle-dark-theme"
                    selected={darkTheme}
                    onClick={() => handleDarkThemeChange(!darkTheme)}
                  >
                    Dark Cogmit Card
                  </SelectionButton>
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {isGenerating ? "Generating…" : "Generate Cogmit Card"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCardGenerated(false)}
                  className="border-[#4B0084] hover:bg-[#4B0084]/15"
                >
                  Change Options
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleDownloadCard}
                  disabled={isExporting || !cardSvg}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {isExporting ? "Exporting…" : "Download Cogmit Card"}
                </Button>
              </>
            )}
          </div>

          {/* Dynamic Preview Area */}
          <div className="space-y-2">
            {!cardGenerated ? (
              /* State A: Default Modal State (No Card Generated) — Rich Link preview */
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="text-xs text-muted-foreground font-medium">
                  {authorId ? `${authorId}'s Cogmit` : "Cogmit"}
                  {published && ` · ${formatTimestamp(published)}`}
                </div>

                <h3 className="font-semibold text-base break-words text-foreground" title={sharingText}>
                  {sharingText}
                </h3>
              </div>
            ) : (
              /* State B: After Clicking Generate Cogmit Card — Generated Cogmit Card preview */
              <div
                className={`overflow-hidden rounded-lg border-2 shadow-sm ${previewBg} flex items-center justify-center w-full max-w-full ${
                  withDescription ? "" : "aspect-[4/3]"
                }`}
                style={{ borderColor: "#4B0084", boxSizing: "border-box" }}
              >
                {previewUrl && !imageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={previewUrl}
                    src={previewUrl}
                    alt={`Cogmit Card - ${title}`}
                    className="w-full h-auto max-w-full select-none block"
                    onError={() => setImageError(true)}
                    style={{ boxSizing: "border-box", width: "100%", maxWidth: "100%", display: "block" }}
                  />
                ) : cardSvg ? (
                  <div
                    className="w-full max-w-full select-none"
                    style={{ boxSizing: "border-box", width: "100%", maxWidth: "100%" }}
                    dangerouslySetInnerHTML={{ __html: cardSvg }}
                  />
                ) : (
                  <div className={`p-8 text-xs ${darkTheme ? "text-[#FFFF11]" : "text-[#4B0084]"}`}>
                    Generating preview…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
