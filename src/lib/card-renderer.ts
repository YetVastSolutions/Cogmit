/**
 * Deterministic Cogmit Card Renderer
 * Follows YVS Visual Language and Cogmit specifications:
 * - Deterministic SVG generation with exact text rendering.
 * - Border color: YV Indigo Violet (#4B0084). Card interior: neutral surface.
 * - Text color: dark foreground (#17121C) on light card surface.
 * - Canvas dimensions: 900 x 1200 (3:4 portrait ratio, social-media friendly).
 * - Displays author/branding, title, up to 200 characters of RootCog excerpt, and canonical URL.
 * - Safe XML escaping, text wrapping, and overflow prevention.
 * - In-memory client caching ensuring cards are reused and not regenerated unnecessarily.
 * - Deterministic PNG/JPEG rasterization via HTML5 Canvas.
 */

export const TEMPLATE_VERSION = "1.0.0";
export const CARD_WIDTH = 900;
export const CARD_HEIGHT = 1200;
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
 * Generates deterministic SVG XML for the Cogmit Card.
 * Portrait 3:4 canvas (900×1200). YV Indigo Violet border on neutral surface.
 */
export function generateCardSvg({
  title,
  excerpt,
  url,
  authorId,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
}: CardTemplateOptions): string {
  // Author header: "COGMIT | username" — username lowercase, no @
  const rawUsername = authorId ? authorId.toLowerCase() : "";
  const safeUsername = escapeXml(rawUsername);

  // Strip https:// from displayed URL; keep full URL for the underlying link
  const displayUrl = escapeXml(url.replace(/^https?:\/\//, ""));

  // Wrap title (max ~34 chars per line at this width, up to 3 lines)
  const titleLines = wrapText(title || "Untitled Cogmit", 34).slice(0, 3);

  // Wrap excerpt (max ~44 chars per line)
  const excerptLines = wrapText(excerpt, 44);

  // SVG layout constants
  const paddingX = 64;
  const borderInset = 28;
  const borderRadius = 20;

  // Light neutral card surface (#F8F5FA ≈ near-white with slight warmth)
  const COLOR_SURFACE = "#F8F5FA";
  const COLOR_FOREGROUND = "#17121C";
  const COLOR_MUTED = "#64748B";
  const COLOR_DIVIDER = COLOR_INDIGO_VIOLET;

  // Header
  const headerY = 108;

  // Title
  const titleStartY = 200;
  const titleLineHeight = 52;

  // Divider after title
  const divider1Y = titleStartY + (titleLines.length - 1) * titleLineHeight + 52;

  // Excerpt
  const excerptStartY = divider1Y + 52;
  const excerptLineHeight = 44;

  // Footer
  const divider2Y = height - 110;
  const footerY = height - 68;

  // Build title tspans
  const titleTspans = titleLines
    .map(
      (line, idx) =>
        `<tspan x="${paddingX}" dy="${idx === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("\n        ");

  // Build excerpt tspans
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
      .bg { fill: ${COLOR_SURFACE}; }
      .outer-border { fill: none; stroke: ${COLOR_INDIGO_VIOLET}; stroke-width: 3; }
      .brand { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 22px; font-weight: 700; fill: ${COLOR_INDIGO_VIOLET}; letter-spacing: 3px; }
      .separator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 22px; font-weight: 400; fill: ${COLOR_MUTED}; }
      .author-name { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 22px; font-weight: 700; fill: ${COLOR_FOREGROUND}; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 44px; font-weight: 800; fill: ${COLOR_FOREGROUND}; }
      .excerpt { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 28px; font-weight: 400; fill: ${COLOR_FOREGROUND}; }
      .url-label { font-family: "JetBrains Mono", Consolas, Monaco, monospace; font-size: 20px; font-weight: 500; fill: ${COLOR_INDIGO_VIOLET}; }
      .divider { stroke: ${COLOR_DIVIDER}; stroke-width: 1; stroke-opacity: 0.18; }
    </style>
  </defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  <text x="${paddingX}" y="${headerY}">
    <tspan class="brand">COGMIT</tspan><tspan dx="14" class="separator"> | </tspan><tspan class="author-name">${safeUsername}</tspan>
  </text>

  <!-- Title -->
  <text x="${paddingX}" y="${titleStartY}" class="title">
    ${titleTspans}
  </text>

  <!-- Divider below title -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />

  <!-- Excerpt (RootCog text, up to 200 chars) -->
  <text x="${paddingX}" y="${excerptStartY}" class="excerpt">
    ${excerptTspans}
  </text>

  <!-- Footer divider -->
  <line x1="${paddingX}" y1="${divider2Y}" x2="${width - paddingX}" y2="${divider2Y}" class="divider" />

  <!-- Footer: Canonical URL (https:// stripped from display) -->
  <text x="${paddingX}" y="${footerY}" class="url-label">${displayUrl}</text>
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
 * Default dimensions match the Cogmit Card portrait canvas (900×1200).
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
