/**
 * Deterministic Cogmit Card Renderer
 * Follows YVS Visual Language and Cogmit specifications:
 * - Deterministic SVG generation with exact text rendering.
 * - Two independent options: withDescription (portrait 3:4) / landscape (4:3), darkTheme.
 * - Dark theme: black background, YV Indigo Violet border/dividers, YV Yellow text.
 * - Light theme: neutral surface background, YV Indigo Violet border, dark foreground text.
 * - Title limit: 147 characters. Description limit: 397 characters.
 * - Safe XML escaping, text wrapping, and overflow prevention.
 * - In-memory client caching ensuring cards are reused and not regenerated unnecessarily.
 * - Deterministic PNG/JPEG rasterization via HTML5 Canvas.
 */

export const TEMPLATE_VERSION = "1.1.0";

// Canvas dimensions
export const CARD_WIDTH_PORTRAIT = 900;   // 3:4 portrait (with description)
export const CARD_HEIGHT_PORTRAIT = 1200;
export const CARD_WIDTH_LANDSCAPE = 1200; // 4:3 landscape (without description)
export const CARD_HEIGHT_LANDSCAPE = 900;

// Legacy exports kept for API compatibility
export const CARD_WIDTH = CARD_WIDTH_PORTRAIT;
export const CARD_HEIGHT = CARD_HEIGHT_PORTRAIT;

// YVS brand colour tokens
export const COLOR_INDIGO_VIOLET = "#4B0084";
export const COLOR_YELLOW = "#FFFF11";

// Content limits
export const CARD_TITLE_MAX = 147;
export const CARD_DESCRIPTION_MAX = 397;

/** Shared single source of truth for the RootCog title maximum length. */
export const MAX_ROOTCOG_TITLE_LENGTH = CARD_TITLE_MAX;

export interface CardTemplateOptions {
  title: string;
  excerpt: string;
  url: string;
  authorId?: string;
  published?: string;
  templateVersion?: string;
  /** Include description block and use portrait 3:4 layout. Default false. */
  withDescription?: boolean;
  /** Use dark theme (black bg, YV Yellow text). Default true. */
  darkTheme?: boolean;
  // width/height are derived from withDescription; kept for back-compat but ignored.
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
 * Includes withDescription and darkTheme flags so option changes invalidate the cache.
 */
export function computeCardSourceHash(
  title: string,
  excerpt: string,
  url: string,
  authorId?: string,
  templateVersion: string = TEMPLATE_VERSION,
  withDescription = false,
  darkTheme = true
): string {
  const payload = `${templateVersion}|${title}|${excerpt}|${url}|${authorId || ""}|desc:${withDescription}|dark:${darkTheme}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${payload.length}`;
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

/** Builds a sequence of SVG <tspan> elements for multi-line text. */
function buildTspans(lines: string[], x: number, lineHeight: number): string {
  return lines
    .map(
      (line, idx) =>
        `<tspan x="${x}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("\n        ");
}

// ─── Theme colour sets ────────────────────────────────────────────────────────

interface ThemeColors {
  bg: string;
  borderColor: string;
  brand: string;
  separator: string;
  authorName: string;
  title: string;
  excerpt: string;
  urlIntro: string;
  urlLabel: string;
  divider: string;
  dividerOpacity: string;
}

function getDarkTheme(): ThemeColors {
  return {
    bg: "#000000",
    borderColor: COLOR_INDIGO_VIOLET,
    brand: COLOR_YELLOW,
    separator: COLOR_YELLOW,
    authorName: COLOR_YELLOW,
    title: COLOR_YELLOW,
    excerpt: COLOR_YELLOW,
    urlIntro: COLOR_YELLOW,
    urlLabel: COLOR_YELLOW,
    divider: COLOR_INDIGO_VIOLET,
    dividerOpacity: "0.9",
  };
}

function getLightTheme(): ThemeColors {
  return {
    bg: "#F8F5FA",
    borderColor: COLOR_INDIGO_VIOLET,
    brand: COLOR_INDIGO_VIOLET,
    separator: "#64748B",
    authorName: "#17121C",
    title: "#17121C",
    excerpt: "#17121C",
    urlIntro: COLOR_INDIGO_VIOLET,
    urlLabel: COLOR_INDIGO_VIOLET,
    divider: COLOR_INDIGO_VIOLET,
    dividerOpacity: "0.18",
  };
}

// ─── CSS style block ──────────────────────────────────────────────────────────

function buildStyles(c: ThemeColors): string {
  const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif`;
  const mono = `"JetBrains Mono", Consolas, Monaco, monospace`;
  return `
      .bg { fill: ${c.bg}; }
      .outer-border { fill: none; stroke: ${c.borderColor}; stroke-width: 3; }
      .brand { font-family: ${font}; font-size: 22px; font-weight: 700; fill: ${c.brand}; letter-spacing: 3px; }
      .sep   { font-family: ${font}; font-size: 22px; font-weight: 400; fill: ${c.separator}; letter-spacing: 0; }
      .author-name { font-family: ${font}; font-size: 22px; font-weight: 700; fill: ${c.authorName}; letter-spacing: 0; }
      .title { font-family: ${font}; font-size: 44px; font-weight: 800; fill: ${c.title}; }
      .excerpt { font-family: ${font}; font-size: 28px; font-weight: 400; fill: ${c.excerpt}; }
      .url-intro { font-family: ${mono}; font-size: 19px; font-weight: 500; fill: ${c.urlIntro}; }
      .url-label { font-family: ${mono}; font-size: 20px; font-weight: 700; fill: ${c.urlLabel}; }
      .divider { stroke: ${c.divider}; stroke-width: 1.5; stroke-opacity: ${c.dividerOpacity}; }`.trimStart();
}

// ─── Header SVG fragment ──────────────────────────────────────────────────────

/**
 * Author header: COGMIT | username
 * Symmetrical spacing: equal dx on both sides of " | "
 */
function buildHeader(paddingX: number, headerY: number, safeUsername: string): string {
  // Each side of " | " gets the same dx (12px), giving equal optical distance
  return `<text x="${paddingX}" y="${headerY}">
    <tspan class="brand">COGMIT</tspan><tspan dx="12" class="sep">|</tspan><tspan dx="12" class="author-name">${safeUsername}</tspan>
  </text>`;
}

// ─── Footer SVG fragment (two rows) ──────────────────────────────────────────

function buildFooter(
  paddingX: number,
  divider2Y: number,
  footerIntroY: number,
  footerUrlY: number,
  width: number,
  displayUrl: string
): string {
  return `
  <!-- Footer divider -->
  <line x1="${paddingX}" y1="${divider2Y}" x2="${width - paddingX}" y2="${divider2Y}" class="divider" />

  <!-- Footer row 1: intro -->
  <text x="${paddingX}" y="${footerIntroY}" class="url-intro">Full content at COGMIT:</text>

  <!-- Footer row 2: link -->
  <text x="${paddingX}" y="${footerUrlY}" class="url-label">${displayUrl}</text>`;
}

// ─── Portrait card (3:4, with description) ───────────────────────────────────

function generatePortraitSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, excerpt, url, authorId } = opts;

  const width = CARD_WIDTH_PORTRAIT;
  const height = CARD_HEIGHT_PORTRAIT;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayUrl = escapeXml(url.replace(/^https?:\/\//, ""));

  const paddingX = 64;
  const borderInset = 28;
  const borderRadius = 20;

  // Title: up to 5 lines for 147 chars, ~34 chars per line (portrait width ~772px usable)
  const titleLines = wrapText(title || "Untitled Cogmit", 34).slice(0, 5);

  // Description: ~44 chars per line (uses full available width)
  const excerptLines = wrapText(excerpt, 44);

  const headerY = 108;

  const titleStartY = 204;
  const titleLineHeight = 54;

  const divider1Y = titleStartY + (titleLines.length - 1) * titleLineHeight + 56;

  const excerptStartY = divider1Y + 54;
  const excerptLineHeight = 46;

  // Footer: two rows
  const divider2Y = height - 136;
  const footerIntroY = height - 96;
  const footerUrlY = height - 58;

  const titleTspans = buildTspans(titleLines, paddingX, titleLineHeight);
  const excerptTspans = buildTspans(excerptLines, paddingX, excerptLineHeight);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs><style>${buildStyles(c)}</style></defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername)}

  <!-- Title -->
  <text x="${paddingX}" y="${titleStartY}" class="title">
    ${titleTspans}
  </text>

  <!-- Divider below title -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />

  <!-- Description (up to 397 chars) -->
  <text x="${paddingX}" y="${excerptStartY}" class="excerpt">
    ${excerptTspans}
  </text>
  ${buildFooter(paddingX, divider2Y, footerIntroY, footerUrlY, width, displayUrl)}
</svg>`;
}

// ─── Landscape card (4:3, no description) ────────────────────────────────────

function generateLandscapeSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, url, authorId } = opts;

  const width = CARD_WIDTH_LANDSCAPE;
  const height = CARD_HEIGHT_LANDSCAPE;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayUrl = escapeXml(url.replace(/^https?:\/\//, ""));

  const paddingX = 80;
  const borderInset = 32;
  const borderRadius = 24;

  // Title: up to 4 lines for 147 chars, ~42 chars per line (landscape width ~1040px usable)
  const titleLines = wrapText(title || "Untitled Cogmit", 42).slice(0, 4);

  // Layout: landscape has more horizontal space — vertically distribute content
  const headerY = 110;

  const titleStartY = 240;
  const titleLineHeight = 68;

  // Vertically centre the title block in the card
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const centredTitleY = Math.round((height - titleBlockHeight) / 2 - 20);
  const usedTitleStartY = Math.max(titleStartY, centredTitleY);

  const divider1Y = usedTitleStartY + (titleLines.length - 1) * titleLineHeight + 60;

  // Footer: two rows
  const divider2Y = height - 148;
  const footerIntroY = height - 104;
  const footerUrlY = height - 62;

  const titleTspans = buildTspans(titleLines, paddingX, titleLineHeight);

  // Landscape title is larger
  const landscapeStyle = `
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; font-size: 56px; font-weight: 800; fill: ${c.title}; }`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs><style>${buildStyles(c)}${landscapeStyle}</style></defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername)}

  <!-- Divider below header -->
  <line x1="${paddingX}" y1="${headerY + 24}" x2="${width - paddingX}" y2="${headerY + 24}" class="divider" />

  <!-- Title -->
  <text x="${paddingX}" y="${usedTitleStartY}" class="title">
    ${titleTspans}
  </text>

  <!-- Divider below title -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />
  ${buildFooter(paddingX, divider2Y, footerIntroY, footerUrlY, width, displayUrl)}
</svg>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates deterministic SVG XML for the Cogmit Card.
 *
 * - withDescription=false (default) → 4:3 landscape, no description
 * - withDescription=true            → 3:4 portrait, with description
 * - darkTheme=true (default)        → black bg, YV Yellow text, YV Indigo borders
 * - darkTheme=false                 → light neutral bg, dark foreground text
 */
export function generateCardSvg(opts: CardTemplateOptions): string {
  const withDescription = opts.withDescription ?? false;
  const darkTheme = opts.darkTheme ?? true;

  const colors = darkTheme ? getDarkTheme() : getLightTheme();

  return withDescription
    ? generatePortraitSvg(opts, colors)
    : generateLandscapeSvg(opts, colors);
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
 * Width and height must match the SVG's actual dimensions for correct rasterization.
 */
export async function exportSvgToBlob(
  svgString: string,
  width: number,
  height: number,
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
 * Returns the pixel dimensions for a card based on the withDescription option.
 */
export function getCardDimensions(withDescription: boolean): { width: number; height: number } {
  return withDescription
    ? { width: CARD_WIDTH_PORTRAIT, height: CARD_HEIGHT_PORTRAIT }
    : { width: CARD_WIDTH_LANDSCAPE, height: CARD_HEIGHT_LANDSCAPE };
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
