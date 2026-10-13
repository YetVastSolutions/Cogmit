/**
 * Deterministic Cognition Card Renderer
 * Follows YVS Visual Language and Cogmit specifications:
 * - Deterministic SVG generation with exact text rendering.
 * - Background color: YV's Indigoviolet (#4B0084).
 * - Text color: YV's yellow (#FFFF11).
 * - Canvas dimensions: 1200 x 630 (mobile sharing friendly 1.91:1 ratio).
 * - Displays author/branding, title, up to 200 characters of RootCog excerpt, and canonical URL.
 * - Safe XML escaping, text wrapping, and overflow prevention.
 * - In-memory client caching ensuring cards are reused and not regenerated unnecessarily.
 * - Deterministic PNG/JPEG rasterization via HTML5 Canvas.
 */

export const TEMPLATE_VERSION = "1.0.0";
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const COLOR_INDIGO_VIOLET = "#4B0084";
export const COLOR_YELLOW = "#FFFF11";

export interface CardTemplateOptions {
  title: string;
  excerpt: string;
  url: string;
  authorId?: string;
  published?: string;
  templateVersion?: string;
  width?: number;
  height?: number;
}

export interface CachedCard {
  cacheKey: string;
  sourceHash: string;
  excerpt: string;
  canonicalUrl: string;
  templateVersion: string;
  svgString: string;
  blob?: Blob;
  blobUrl?: string;
  createdAt?: number;
}

// Module-level in-memory cache for generated cards
const cardCache = new Map<string, CachedCard>();

/**
 * Escapes characters for safe inclusion in SVG / XML.
 */
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Deterministic word-wrapping algorithm.
 * Splits text into lines that do not exceed maxCharsPerLine.
 * Long words exceeding the limit are cleanly broken across lines.
 */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;

    // If a single word is longer than maxCharsPerLine, break it
    if (word.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates a deterministic hash string representing the card's source data.
 */
export function computeCardSourceHash(
  title: string,
  excerpt: string,
  url: string,
  authorId?: string,
  templateVersion: string = TEMPLATE_VERSION
): string {
  const payload = `${templateVersion}|${title}|${excerpt}|${url}|${authorId || ""}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${payload.length}`;
}

/**
 * Generates deterministic SVG XML for the Cognition Card.
 */
export function generateCardSvg({
  title,
  excerpt,
  url,
  authorId,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
}: CardTemplateOptions): string {
  const safeAuthor = escapeXml(authorId ? `@${authorId}` : "Cogmit");
  const safeUrl = escapeXml(url);

  // Wrap title (max ~42 chars per line, up to 2 lines)
  const titleLines = wrapText(title || "Untitled Cogmit", 42).slice(0, 2);

  // Wrap excerpt (max ~52 chars per line)
  const excerptLines = wrapText(excerpt, 52);

  // SVG dimensions & padding
  const paddingX = 70;

  // Header Y coordinate
  const headerY = 90;

  // Title start Y
  const titleStartY = 160;
  const titleLineHeight = 44;

  // Divider 1 Y
  const divider1Y = titleStartY + (titleLines.length - 1) * titleLineHeight + 40;

  // Excerpt start Y
  const excerptStartY = divider1Y + 50;
  const excerptLineHeight = 40;

  // Footer divider & URL Y
  const divider2Y = height - 100;
  const footerY = height - 60;

  // Format title lines TSPANS
  const titleTspans = titleLines
    .map(
      (line, idx) =>
        `<tspan x="${paddingX}" dy="${idx === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("\n        ");

  // Format excerpt lines TSPANS
  const excerptTspans = excerptLines
    .map(
      (line, idx) =>
        `<tspan x="${paddingX}" dy="${idx === 0 ? 0 : excerptLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("\n        ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .bg { fill: ${COLOR_INDIGO_VIOLET}; }
      .brand { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 20px; font-weight: 700; fill: ${COLOR_YELLOW}; fill-opacity: 0.9; letter-spacing: 2px; }
      .author { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 18px; font-weight: 500; fill: ${COLOR_YELLOW}; fill-opacity: 0.75; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 38px; font-weight: 800; fill: ${COLOR_YELLOW}; }
      .excerpt { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 28px; font-weight: 400; fill: ${COLOR_YELLOW}; line-height: 1.45; }
      .url-label { font-family: "JetBrains Mono", Consolas, Monaco, monospace; font-size: 18px; font-weight: 500; fill: ${COLOR_YELLOW}; fill-opacity: 0.85; }
      .card-border { stroke: ${COLOR_YELLOW}; stroke-width: 1.5; stroke-opacity: 0.25; fill: none; }
      .divider { stroke: ${COLOR_YELLOW}; stroke-width: 1; stroke-opacity: 0.2; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- Inner Structural Border -->
  <rect x="36" y="36" width="${width - 72}" height="${height - 72}" rx="16" class="card-border" />

  <!-- Header: Branding & Author -->
  <text x="${paddingX}" y="${headerY}">
    <tspan class="brand">COGMIT</tspan>
    <tspan dx="16" class="author">·  ${safeAuthor}</tspan>
  </text>

  <!-- Title -->
  <text x="${paddingX}" y="${titleStartY}" class="title">
    ${titleTspans}
  </text>

  <!-- Top Divider -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />

  <!-- Excerpt (actual RootCog text, up to 200 chars) -->
  <text x="${paddingX}" y="${excerptStartY}" class="excerpt">
    ${excerptTspans}
  </text>

  <!-- Bottom Divider -->
  <line x1="${paddingX}" y1="${divider2Y}" x2="${width - paddingX}" y2="${divider2Y}" class="divider" />

  <!-- Footer: Canonical Public RootCog URL -->
  <text x="${paddingX}" y="${footerY}" class="url-label">
    ${safeUrl}
  </text>
</svg>`;
}

/**
 * Retrieves a cached card if its source hash and template version still match.
 * Automatically invalidates stale cards when source content changes.
 */
export function getCachedCard(
  cacheKey: string,
  currentSourceHash: string
): CachedCard | null {
  const cached = cardCache.get(cacheKey);
  if (!cached) return null;

  if (cached.sourceHash !== currentSourceHash) {
    if (cached.blobUrl && typeof URL !== "undefined") {
      URL.revokeObjectURL(cached.blobUrl);
    }
    cardCache.delete(cacheKey);
    return null;
  }

  return cached;
}

/**
 * Stores a card in the in-memory cache.
 */
export function setCachedCard(cacheKey: string, entry: CachedCard): void {
  cardCache.set(cacheKey, entry);
}

/**
 * Exports an SVG XML string to a PNG or JPEG Blob using client HTML5 Canvas.
 */
export async function exportSvgToBlob(
  svgString: string,
  width: number = CARD_WIDTH,
  height: number = CARD_HEIGHT,
  format: "image/png" | "image/jpeg" = "image/png"
): Promise<Blob> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    throw new Error("Client environment with Image and Canvas is required for image export");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("2D Canvas context unavailable"));
          return;
        }

        // Draw the rasterized SVG image
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas failed to produce image blob"));
            }
          },
          format,
          0.95
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load SVG for export: ${err}`));
    };

    img.src = blobUrl;
  });
}

/**
 * Triggers an explicit user-initiated download of an image Blob.
 */
export function triggerImageDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
