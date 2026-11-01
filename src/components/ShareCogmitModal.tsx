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
import { extractExcerpt, formatTimestamp } from "@/lib/utils";
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
 * Compact toggle pill used in the generation-options row.
 */
function TogglePill({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none text-sm"
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
          checked
            ? "border-[#4B0084] bg-[#4B0084]"
            : "border-muted-foreground/40 bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[14px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      <span className={checked ? "text-foreground font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </label>
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

  // Description excerpt up to CARD_DESCRIPTION_MAX (597) chars
  const excerpt = useMemo(() => {
    return extractExcerpt(content || description || "", CARD_DESCRIPTION_MAX, title);
  }, [content, description, title]);

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
        {/* A. Modal Header */}
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
          {/* B. Canonical Cogmit Link Component */}
          {shareUrl && (
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Canonical Cogmit URL
              </div>
              <div className="break-all font-mono text-xs text-foreground/90 select-all">
                {shareUrl}
              </div>
            </div>
          )}

          {/* C. Sharing Actions */}
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

            {/* 3. Copy Image */}
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
                  Copied Image!
                </>
              ) : (
                <>
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  Copy Image
                </>
              )}
            </Button>

            {/* 4. Download Cogmit Card */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadCard}
              disabled={!cardGenerated || isExporting || !cardSvg}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isExporting ? "Exporting…" : "Download Cogmit Card"}
            </Button>
          </div>

          {copyError && (
            <p className="text-xs text-destructive">
              Failed to copy to clipboard. Please copy manually or use download.
            </p>
          )}

          {/* 3. Cogmit Card Generation Options */}
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

          {/* Generation options row — hidden once card is generated, visible before generation or when editing options */}
          <div
            className={`flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 ${
              cardGenerated ? "hidden" : "flex"
            }`}
          >
            <TogglePill
              id="toggle-with-description"
              checked={withDescription}
              onChange={handleWithDescriptionChange}
              label="With description"
            />
            <TogglePill
              id="toggle-dark-theme"
              checked={darkTheme}
              onChange={handleDarkThemeChange}
              label="Dark Cogmit Card"
            />
            <Button
              type="button"
              size="sm"
              variant="default"
              className="ml-auto"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {isGenerating ? "Generating…" : "Generate Cogmit Card"}
            </Button>
          </div>

          {/* 4. Preview Area — Dynamically displays State A (Rich Link) or State B (Generated Cogmit Card) */}
          <div className="space-y-2">
            {!cardGenerated ? (
              /* State A: Default Modal State (No Card Generated) — Rich Link preview */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="font-medium text-foreground">Rich Link Preview</span>
                  <span>Social crawler compatible</span>
                </div>

                {/* Rich Link Card Preview */}
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <div className="text-xs text-muted-foreground font-medium">
                    {authorId ? `${authorId}'s Cogmit` : "Cogmit"}
                    {published && ` · ${formatTimestamp(published)}`}
                  </div>

                  <h3 className="font-semibold text-base break-words text-foreground" title={title}>
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

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Open Graph &amp; Twitter summary metadata</span>
                  <span className="font-mono">{excerpt.length} / {CARD_DESCRIPTION_MAX} chars</span>
                </div>
              </div>
            ) : (
              /* State B: After Clicking Generate Cogmit Card — Generated Cogmit Card preview */
              <div className="space-y-2">
                {/* Transition bar above preview showing active layout & Change options action */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {withDescription ? "Portrait" : "Landscape 4:3"}
                    </span>
                    <span>·</span>
                    <span>{darkTheme ? "Dark" : "Light"} theme</span>
                    {withDescription && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{excerpt.length} / {CARD_DESCRIPTION_MAX} chars</span>
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setCardGenerated(false)}
                  >
                    Change options
                  </Button>
                </div>

                {/* Card preview container */}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
