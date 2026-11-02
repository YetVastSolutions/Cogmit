"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  Link as LinkIcon,
  Pencil,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import {
  CARD_DESCRIPTION_MAX,
  CARD_FONTS,
  DEFAULT_CARD_FONT,
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
  // Card generation options — defaults: withDescription=OFF, darkTheme=ON, font=Arial
  const [withDescription, setWithDescription] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);
  const [selectedFont, setSelectedFont] = useState<string>(DEFAULT_CARD_FONT);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

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

  // Truncate title to MAX_ROOTCOG_TITLE_LENGTH (197 chars) without appending ChildCog or body content
  const truncatedTitle = useMemo(() => {
    return (title || "").slice(0, MAX_ROOTCOG_TITLE_LENGTH);
  }, [title]);

  // Generated sharing text format: Cogmit | <username>: <cogmit title>
  const sharingText = useMemo(() => {
    const username = authorId || "user";
    return `Cogmit | ${username}: ${truncatedTitle}`;
  }, [authorId, truncatedTitle]);

  // Deterministic source hash — includes option flags
  const sourceHash = useMemo(() => {
    return computeCardSourceHash(
      title,
      excerpt,
      shareUrl,
      authorId,
      TEMPLATE_VERSION,
      withDescription,
      darkTheme,
      selectedFont
    );
  }, [title, excerpt, shareUrl, authorId, withDescription, darkTheme, selectedFont]);

  // Cache key includes options so each combination is independently cached
  const cacheKey = `${shareUrl || `${authorId || "anon"}_${title}`}|desc:${withDescription}|dark:${darkTheme}|font:${selectedFont}`;

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
        font: selectedFont,
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
  }, [open, cardGenerated, cacheKey, sourceHash, title, excerpt, shareUrl, authorId, published, withDescription, darkTheme, selectedFont]);

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
        setSelectedFont(DEFAULT_CARD_FONT);
        setIsOptionsExpanded(false);
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
        font: selectedFont,
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

  // Update option selections
  const handleWithDescriptionChange = (v: boolean) => {
    setWithDescription(v);
    setGenerationError(null);
  };

  const handleDarkThemeChange = (v: boolean) => {
    setDarkTheme(v);
    setGenerationError(null);
  };

  const handleFontChange = (f: string) => {
    setSelectedFont(f);
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
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors inline-flex items-center justify-center"
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
          <div className="flex flex-wrap items-center justify-center gap-2">
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
            <p className="text-xs text-destructive text-center">
              Failed to copy to clipboard. Please copy manually or use download.
            </p>
          )}

          {/* Generation Error Alert */}
          {generationError && (
            <div className="w-full sm:w-[75%] mx-auto rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between gap-2">
              <span>{generationError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-destructive/40 hover:bg-destructive/20 inline-flex items-center justify-center"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Unified Primary Card Action Bar & Expandable Options Container */}
          <div className="w-full sm:w-[75%] mx-auto flex flex-col gap-2">
            <div className="w-full rounded-lg border-2 border-[#4B0084] bg-[#1E0038] p-1.5 flex items-center justify-between gap-2 shadow-sm">
              {/* Left Section: Primary Action (Generate / Download) */}
              <button
                type="button"
                onClick={!cardGenerated ? handleGenerate : handleDownloadCard}
                disabled={!cardGenerated ? isGenerating : isExporting || !cardSvg}
                className="inline-flex items-center gap-2 text-sm font-semibold hover:bg-[#4B0084] text-[#FFFF11] hover:brightness-110 active:opacity-90 transition-all px-2.5 py-1.5 rounded text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 shrink-0 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {!cardGenerated ? (
                  <span className="whitespace-nowrap">{isGenerating ? "Generating…" : "Generate Cogmit Card"}</span>
                ) : (
                  <>
                    <Download className="h-4 w-4 shrink-0 min-w-4 min-h-4 max-w-4 max-h-4 text-[#FFFF11]" />
                    <span className="whitespace-nowrap">{isExporting ? "Exporting…" : "Download Cogmit Card"}</span>
                  </>
                )}
              </button>

              {/* Right Section: Pencil Icon to Toggle Options */}
              <button
                id="btn-change-options"
                type="button"
                aria-label={isOptionsExpanded ? "Collapse card options" : "Expand card options"}
                aria-expanded={isOptionsExpanded}
                title={isOptionsExpanded ? "Collapse options" : "Edit card options"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOptionsExpanded((prev) => !prev);
                }}
                className={`inline-flex items-center justify-center p-1.5 mr-1 rounded text-[#FFFF11] hover:bg-[#4B0084] transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0 ${
                  isOptionsExpanded ? "bg-[#4B0084]" : ""
                }`}
              >
                <Pencil className="h-4 w-4 shrink-0 min-w-4 min-h-4 max-w-4 max-h-4" />
              </button>
            </div>

            {/* Expandable Options Container directly below the button */}
            {isOptionsExpanded && (
              <div
                id="cogmit-card-options-container"
                className="w-full rounded-lg border-2 border-[#4B0084] bg-[#1E0038] p-3 shadow-sm flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
              >
                {/* Option 1: Description */}
                <button
                  id="toggle-with-description"
                  type="button"
                  role="switch"
                  aria-checked={withDescription}
                  aria-label="Description"
                  onClick={() => handleWithDescriptionChange(!withDescription)}
                  className="flex items-center gap-2.5 text-sm text-white hover:text-white/90 cursor-pointer select-none py-1 text-left w-fit transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#FFFF11] rounded"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
                      withDescription ? "bg-[#FFFF11]" : "bg-white"
                    }`}
                  />
                  <span className="font-medium leading-none">Description</span>
                </button>

                {/* Option 2: Dark */}
                <button
                  id="toggle-dark-theme"
                  type="button"
                  role="switch"
                  aria-checked={darkTheme}
                  aria-label="Dark"
                  onClick={() => handleDarkThemeChange(!darkTheme)}
                  className="flex items-center gap-2.5 text-sm text-white hover:text-white/90 cursor-pointer select-none py-1 text-left w-fit transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#FFFF11] rounded"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
                      darkTheme ? "bg-[#FFFF11]" : "bg-white"
                    }`}
                  />
                  <span className="font-medium leading-none">Dark</span>
                </button>

                {/* Option 3: Font */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#4B0084]/40">
                  <label htmlFor="card-font-select" className="text-sm font-medium text-white select-none">
                    Font
                  </label>
                  <select
                    id="card-font-select"
                    aria-label="Font"
                    value={selectedFont}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="bg-[#2D0052] text-white border border-[#4B0084] rounded px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#FFFF11] cursor-pointer"
                  >
                    {CARD_FONTS.map((font) => (
                      <option key={font.id} value={font.id} className="bg-[#1E0038] text-white">
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                className={`overflow-hidden rounded-lg ${previewBg} flex items-center justify-center w-full max-w-full ${withDescription ? "aspect-[2/3]" : "aspect-[3/2]"
                  }`}
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
