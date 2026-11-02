/**
 * Deterministic Cogmit Card Renderer
 * Follows YVS Visual Language and Cogmit specifications:
 * - Deterministic SVG generation with exact text rendering.
 * - Two independent layouts: withDescription (portrait, 3:4) / landscape (3:2), darkTheme.
 * - Dark theme: black background, YV Indigo Violet border/dividers, YV Yellow text.
 * - Light theme: neutral surface background, YV Indigo Violet border, dark foreground text.
 * - Title limit: 197 characters. Description limit: 597 characters.
 * - Safe XML escaping, text wrapping, and overflow prevention.
 * - In-memory client caching ensuring cards are reused and not regenerated unnecessarily.
 * - Deterministic PNG/JPEG rasterization via HTML5 Canvas.
 */

export const TEMPLATE_VERSION = "1.7.0";

// Exact intrinsic canvas dimensions
export const CARD_WIDTH_PORTRAIT = 969;  // 3:4 portrait
export const CARD_HEIGHT_PORTRAIT = 1292;
export const CARD_WIDTH_LANDSCAPE = 969; // 3:2 landscape
export const CARD_HEIGHT_LANDSCAPE = 646;

// Centralized typography rule for the Generate Cogmit Card image
export const CARD_FONT_STACK = "Verdana, Geneva, sans-serif";
export const CARD_FONT_FAMILY = CARD_FONT_STACK;

// Shared typography tokens used by both card orientations
const FONT_HEADER_SIZE = 47;
const FONT_HEADER_WEIGHT = 800;
const FONT_TITLE_SIZE = 41;
const FONT_TITLE_WEIGHT = 600;
const FONT_BODY_SIZE = 37;
const FONT_BODY_WEIGHT = 400;

// Legacy exports kept for API compatibility
export const CARD_WIDTH = CARD_WIDTH_PORTRAIT;
export const CARD_HEIGHT = CARD_HEIGHT_PORTRAIT;

// YVS brand colour tokens
export const COLOR_INDIGO_VIOLET = "#4B0084";
export const COLOR_YELLOW = "#FFFF11";

// Content limits
/** Shared single source of truth for the RootCog title maximum length across Cogmit. */
export const MAX_ROOTCOG_TITLE_LENGTH = 197;
export const CARD_TITLE_MAX = MAX_ROOTCOG_TITLE_LENGTH;
export const CARD_DESCRIPTION_MAX = 597;

export interface CardTemplateOptions {
  title: string;
  excerpt: string;
  url: string;
  authorId?: string;
  published?: string;
  templateVersion?: string;
  /** Include description block and use portrait layout with content-driven height. Default false. */
  withDescription?: boolean;
  /** Use dark theme (black bg, YV Yellow text). Default true. */
  darkTheme?: boolean;
  // width/height are derived from withDescription and content; kept for back-compat but ignored.
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
 * Proportional character width factor relative to font-size (em).
 * Tuned for standard sans-serif system fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter).
 */
export function getCharWidthFactor(char: string, isBold = false): number {
  if (!char) return 0;
  if (char === " " || char === "\u00A0") return 0.28;
  if ("ijl|![]():;.,'\"`".includes(char)) return 0.28;
  if ("frtI".includes(char)) return 0.35;
  if ("abcdeghknopquvxyzs".includes(char)) return 0.53;
  if ("mw".includes(char)) return 0.78;
  if ("ABCDEFGHJKLNPQRSTUVXYZ".includes(char)) return 0.68;
  if ("MW".includes(char)) return 0.85;
  if ("0123456789".includes(char)) return 0.55;
  if ("-_=+?/#$%&*@".includes(char)) {
    return char === "@" || char === "%" ? 0.85 : 0.55;
  }
  if (char.charCodeAt(0) > 255) return 1.0;
  return isBold ? 0.58 : 0.52;
}

/**
 * Estimates text width in pixels for a given font size and weight.
 */
export function estimateStringWidth(str: string, fontSize: number, isBold = false): number {
  let total = 0;
  const boldMultiplier = isBold ? 1.08 : 1.0;
  for (let i = 0; i < str.length; i++) {
    total += getCharWidthFactor(str[i], isBold) * fontSize * boldMultiplier;
  }
  return total;
}

/**
 * Deterministic word-wrapping algorithm based on pixel width.
 * Splits text into lines that do not exceed maxWidth pixels.
 * Breaks words cleanly if an individual word exceeds maxWidth.
 */
export function wrapTextByWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  isBold = false
): string[] {
  if (!text) return [];

  // Support multi-line input by splitting paragraphs
  const paragraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    const words = trimmedPara.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      if (!word) continue;

      const wordWidth = estimateStringWidth(word, fontSize, isBold);

      // If a single word is wider than maxWidth, break it by character
      if (wordWidth > maxWidth) {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = "";
        }
        let chunk = "";
        for (const char of word) {
          if (estimateStringWidth(chunk + char, fontSize, isBold) > maxWidth && chunk) {
            resultLines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        if (chunk) {
          currentLine = chunk;
        }
        continue;
      }

      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = estimateStringWidth(candidate, fontSize, isBold);

      if (candidateWidth <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Deterministic character-count word-wrapping algorithm.
 * Maintained for backward compatibility with external consumers and existing tests.
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
 * Returns the fixed target height of a portrait Cogmit card (1292px).
 * Target dimensions: 969 × 1292px (3:4 width:height ratio).
 */
export function calculatePortraitHeight(_opts?: Partial<CardTemplateOptions>): number {
  return CARD_HEIGHT_PORTRAIT;
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
  const font = CARD_FONT_FAMILY;
  return `
      svg { width: 100%; height: auto; max-width: 100%; box-sizing: border-box; display: block; font-family: ${font}; }
      text, tspan { font-family: ${font}; text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased; }
      .bg { fill: ${c.bg}; }
      .outer-border { fill: none; stroke: ${c.borderColor}; stroke-width: 3; }
      .brand { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.brand}; letter-spacing: 3px; }
      .sep   { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.separator}; letter-spacing: 0; }
      .author-name { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.authorName}; letter-spacing: 0; }
      .title-container, .title { font-family: ${font}; font-size: ${FONT_TITLE_SIZE}px; font-weight: ${FONT_TITLE_WEIGHT}; fill: ${c.title}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .description-container, .excerpt, p { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.excerpt}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .url-intro { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.urlIntro}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .url-label { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.urlLabel}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .divider { stroke: ${c.divider}; stroke-width: 1.5; stroke-opacity: ${c.dividerOpacity}; }`.trimStart();
}

// ─── Header SVG fragment ──────────────────────────────────────────────────────

/**
 * Author header: COGMIT | username
 * Symmetrical spacing: equal dx on both sides of " | "
 */
function buildHeader(paddingX: number, headerY: number, safeUsername: string): string {
  // Each side of " | " gets the same dx (12px), giving equal optical distance
  return `<text x="${paddingX}" y="${headerY}" font-family="${CARD_FONT_FAMILY}">
    <tspan class="brand">COGMIT</tspan><tspan dx="12" class="sep">.</tspan><tspan dx="12" class="author-name">${safeUsername}</tspan>
  </text>`;
}

// ─── Domain extraction & canonicalization helpers ────────────────────────────

/**
 * Extracts the domain/host from a URL or origin string.
 * Strips protocol, port, path, query parameters, and hashes.
 */
export function extractDomain(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("/")) return "";

  try {
    const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.host) {
      return parsed.host;
    }
  } catch {
    // Fallback string manipulation if URL constructor fails
  }

  return trimmed
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .trim();
}

/**
 * Derives the canonical domain dynamically from the card URL or the application's
 * deployment / environment configuration (NEXT_PUBLIC_APP_URL, VERCEL_PROJECT_PRODUCTION_URL,
 * VERCEL_URL, window.location.host, or fallback).
 */
export function getCanonicalDomain(url?: string): string {
  const extracted = extractDomain(url);
  if (extracted) {
    return extracted;
  }

  // Derive from application canonical deployment URL / origin configuration
  const envUrl = typeof process !== "undefined" && process?.env
    ? (process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined))
    : undefined;

  if (envUrl) {
    const envExtracted = extractDomain(envUrl);
    if (envExtracted) {
      return envExtracted;
    }
  }

  if (typeof window !== "undefined" && window.location?.host) {
    return window.location.host;
  }

  return "cogmit.vercel.app";
}

// ─── Footer SVG fragment (single row: Full: <domain>) ───────────────

function buildFooter(
  paddingX: number,
  divider2Y: number,
  footerY: number,
  width: number,
  displayDomain: string
): string {
  const safeDomain = escapeXml(displayDomain);
  return `
  <!-- Footer divider -->
  <line x1="${paddingX}" y1="${divider2Y}" x2="${width - paddingX}" y2="${divider2Y}" class="divider" />

  <!-- Footer: Full: domain (same line) -->
  <text x="${paddingX}" y="${footerY}" class="url-intro" font-family="${CARD_FONT_FAMILY}">Full: <tspan class="url-label">${safeDomain}</tspan></text>`;
}

// ─── Portrait card (3:4, with description) ────────────────────────────────────

function generatePortraitSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, excerpt, url, authorId } = opts;

  const width = CARD_WIDTH_PORTRAIT;
  const height = CARD_HEIGHT_PORTRAIT;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayDomain = getCanonicalDomain(url);

  // Geometry is scaled for the exact 969 × 1292 portrait canvas.
  const paddingX = 65;
  const borderInset = 26;
  const borderRadius = 20;

  const usableWidth = width - paddingX * 2;
  const maxTextWidth = usableWidth - 16;

  // Title and description use the shared typography tokens.
  const titleLines = wrapTextByWidth(title || "Untitled Cogmit", maxTextWidth, FONT_TITLE_SIZE, false);
  const excerptLines = excerpt
    ? wrapTextByWidth(excerpt, maxTextWidth, FONT_BODY_SIZE, false)
    : [];

  const headerY = 91;
  const headerDividerY = 114;

  const titleStartY = 190;
  const titleLineHeight = 54;
  const titleEndY = titleStartY + Math.max(0, titleLines.length - 1) * titleLineHeight;

  const divider1Y = titleEndY + 36;
  const excerptStartY = divider1Y + 44;
  const excerptLineHeight = 48;

  // Footer is anchored to the bottom safe area of the 1292px canvas.
  const divider2Y = height - 124;
  const footerY = divider2Y + 55;

  const titleTspans = buildTspans(titleLines, paddingX, titleLineHeight);
  const excerptTspans = buildTspans(excerptLines, paddingX, excerptLineHeight);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${CARD_FONT_FAMILY}" style="width: 100%; height: auto; display: block; max-width: 100%; box-sizing: border-box; font-family: ${CARD_FONT_FAMILY};">
  <defs><style>${buildStyles(c)}</style></defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername)}

  <!-- Divider below header -->
  <line x1="${paddingX}" y1="${headerDividerY}" x2="${width - paddingX}" y2="${headerDividerY}" class="divider" />

  <!-- Cog title/content -->
  <text x="${paddingX}" y="${titleStartY}" class="title" font-family="${CARD_FONT_FAMILY}">
    ${titleTspans}
  </text>

  <!-- Divider below title -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />

  <!-- Cog description -->
  <text x="${paddingX}" y="${excerptStartY}" class="excerpt" font-family="${CARD_FONT_FAMILY}">
    ${excerptTspans}
  </text>
  ${buildFooter(paddingX, divider2Y, footerY, width, displayDomain)}
</svg>`;
}

// ─── Landscape card (3:2, no description) ────────────────────────────────────

function generateLandscapeSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, url, authorId } = opts;

  const width = CARD_WIDTH_LANDSCAPE;
  const height = CARD_HEIGHT_LANDSCAPE;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayDomain = getCanonicalDomain(url);

  // Geometry is scaled for the exact 969 × 646 landscape canvas.
  const paddingX = 65;
  const borderInset = 26;
  const borderRadius = 20;

  const usableWidth = width - paddingX * 2;
  const maxTextWidth = usableWidth - 16;

  const titleLines = wrapTextByWidth(
    title || "Untitled Cogmit",
    maxTextWidth,
    FONT_TITLE_SIZE,
    false
  );

  const headerY = 91;
  const headerDividerY = 114;

  // Keep the footer divider and footer anchored to the bottom safe area.
  const divider2Y = height - 124;
  const footerY = divider2Y + 55;

  const titleLineHeight = 54;
  const titleBlockHeight = (titleLines.length - 1) * titleLineHeight + FONT_TITLE_SIZE;
  const availableTitleHeight = divider2Y - headerDividerY;

  // Vertically centre the title block between the header and footer.
  const titleStartY = Math.round(
    headerDividerY + (availableTitleHeight - titleBlockHeight) / 2 + FONT_TITLE_SIZE
  );

  const titleTspans = buildTspans(titleLines, paddingX, titleLineHeight);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${CARD_FONT_FAMILY}" style="width: 100%; height: auto; display: block; max-width: 100%; box-sizing: border-box; font-family: ${CARD_FONT_FAMILY};">
  <defs><style>${buildStyles(c)}</style></defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername)}

  <!-- Divider below header -->
  <line x1="${paddingX}" y1="${headerDividerY}" x2="${width - paddingX}" y2="${headerDividerY}" class="divider" />

  <!-- Cog title/content; no divider below title in Landscape -->
  <text x="${paddingX}" y="${titleStartY}" class="title" font-family="${CARD_FONT_FAMILY}">
    ${titleTspans}
  </text>

  ${buildFooter(paddingX, divider2Y, footerY, width, displayDomain)}
</svg>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates deterministic SVG XML for the Cogmit Card.
 *
 * - withDescription=false (default) → 969 × 646 (3:2 landscape), no description
 * - withDescription=true            → 969 × 1292 (3:4 portrait), with description
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
 * Width and height automatically adapt to the SVG's actual viewBox/attributes for exact rasterization.
 */
export async function exportSvgToBlob(
  svgString: string,
  width?: number,
  height?: number,
  format: "image/png" | "image/jpeg" = "image/png"
): Promise<Blob> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    throw new Error("Client environment with Image and Canvas is required for image export");
  }

  let targetWidth = width;
  let targetHeight = height;

  // Extract dimensions from SVG viewBox if available to ensure canvas matches generated SVG
  const viewBoxMatch = svgString.match(/viewBox=["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*["']/);
  if (viewBoxMatch) {
    const vbW = Math.round(parseFloat(viewBoxMatch[1]));
    const vbH = Math.round(parseFloat(viewBoxMatch[2]));
    if (vbW > 0 && vbH > 0) {
      targetWidth = vbW;
      targetHeight = vbH;
    }
  }

  const exportW = targetWidth || CARD_WIDTH_PORTRAIT;
  const exportH = targetHeight || CARD_HEIGHT_PORTRAIT;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = exportW;
        canvas.height = exportH;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("2D Canvas context unavailable"));
          return;
        }

        // Explicitly set the font family in the actual rendering context
        ctx.font = `400 ${FONT_BODY_SIZE}px ${CARD_FONT_FAMILY}`;

        // Draw the rasterized SVG image at exact intrinsic dimensions
        ctx.drawImage(img, 0, 0, exportW, exportH);

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
 * Returns the pixel dimensions for a card based on the withDescription option and content.
 */
export function getCardDimensions(
  withDescription: boolean,
  opts?: Partial<CardTemplateOptions>
): { width: number; height: number } {
  if (!withDescription) {
    return { width: CARD_WIDTH_LANDSCAPE, height: CARD_HEIGHT_LANDSCAPE };
  }

  const height = opts ? calculatePortraitHeight(opts) : CARD_HEIGHT_PORTRAIT;
  return { width: CARD_WIDTH_PORTRAIT, height };
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
