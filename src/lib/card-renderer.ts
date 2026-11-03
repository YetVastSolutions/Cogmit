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

import {
  TEMPLATE_VERSION,
  CARD_WIDTH_PORTRAIT,
  CARD_HEIGHT_PORTRAIT,
  CARD_WIDTH_LANDSCAPE,
  CARD_HEIGHT_LANDSCAPE,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_FONT_STACK,
  CARD_FONT_FAMILY,
  DEFAULT_CARD_FONT,
  CARD_FONTS,
  COLOR_INDIGO_VIOLET,
  COLOR_YELLOW,
  COLOR_BLACK,
  COLOR_LIGHT_SURFACE,
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY_LIGHT,
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  FONT_HEADER_SIZE,
  FONT_HEADER_WEIGHT,
  FONT_TITLE_SIZE,
  FONT_TITLE_WEIGHT,
  FONT_BODY_SIZE,
  FONT_BODY_WEIGHT,
  CARD_PADDING_X,
  CARD_BORDER_INSET,
  CARD_BORDER_RADIUS,
  CARD_HEADER_Y,
  CARD_HEADER_DIVIDER_Y,
  CARD_TITLE_START_Y,
  CARD_TITLE_LINE_HEIGHT,
  CARD_EXCERPT_LINE_HEIGHT,
  BLOB_REVOKE_DELAY_MS,
  type CardFontOption,
} from "@/constants";

export {
  TEMPLATE_VERSION,
  CARD_WIDTH_PORTRAIT,
  CARD_HEIGHT_PORTRAIT,
  CARD_WIDTH_LANDSCAPE,
  CARD_HEIGHT_LANDSCAPE,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_FONT_STACK,
  CARD_FONT_FAMILY,
  DEFAULT_CARD_FONT,
  CARD_FONTS,
  COLOR_INDIGO_VIOLET,
  COLOR_YELLOW,
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  type CardFontOption,
};

export function resolveCardFontStack(font?: string): string {
  if (!font) return CARD_FONT_FAMILY;
  const match = CARD_FONTS.find(
    (f) => f.id.toLowerCase() === font.toLowerCase() || f.label.toLowerCase() === font.toLowerCase()
  );
  if (match) return match.fontFamily;
  return font;
}

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
  /** Font family or font id to use when rendering the card. Default Arial in UI, fallback to CARD_FONT_FAMILY. */
  font?: string;
  fontFamily?: string;
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
 * Measures text using the same font stack as the SVG renderer.
 * A small safety factor protects against SVG/Canvas metric differences.
 * In non-browser environments, uses a conservative deterministic estimate.
 */
let cardMeasureContext: CanvasRenderingContext2D | null | undefined;

export function estimateStringWidth(
  str: string,
  fontSize: number,
  isBold = false,
  font?: string
): number {
  if (!str) return 0;

  const resolvedFont = resolveCardFontStack(font);
  const fontLower = (font || resolvedFont).toLowerCase();
  const isVerdana = !font || fontLower.includes("verdana");
  const isArial = fontLower.includes("arial");
  const isTimes = fontLower.includes("times");

  if (typeof document !== "undefined") {
    if (cardMeasureContext === undefined) {
      cardMeasureContext = document.createElement("canvas").getContext("2d");
    }

    if (cardMeasureContext) {
      if (isVerdana) {
        cardMeasureContext.font = `${isBold ? FONT_TITLE_WEIGHT : FONT_BODY_WEIGHT} ${fontSize}px ${CARD_FONT_FAMILY}`;
        return cardMeasureContext.measureText(str).width * 1.06;
      }
      cardMeasureContext.font = `${isBold ? FONT_TITLE_WEIGHT : FONT_BODY_WEIGHT} ${fontSize}px ${resolvedFont}`;
      return cardMeasureContext.measureText(str).width * 1.01;
    }
  }

  let total = 0;
  for (const char of Array.from(str)) {
    total += getCharWidthFactor(char, isBold) * fontSize;
  }

  if (isVerdana) {
    return total * 1.18;
  }
  if (isArial) {
    return total * 0.94;
  }
  if (isTimes) {
    return total * 0.85;
  }
  return total * 1.0;
}

/**
 * Wraps text to measured pixel width. Long unbroken tokens are split by
 * character so no generated line intentionally exceeds the safe width.
 */
export function wrapTextByWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  isBold = false,
  font?: string
): string[] {
  if (!text || maxWidth <= 0) return [];

  const resultLines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (estimateStringWidth(candidate, fontSize, isBold, font) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        resultLines.push(currentLine);
        currentLine = "";
      }

      // Split an individual word only when it cannot fit on one line.
      let chunk = "";
      for (const char of Array.from(word)) {
        const nextChunk = chunk + char;
        if (chunk && estimateStringWidth(nextChunk, fontSize, isBold, font) > maxWidth) {
          resultLines.push(chunk);
          chunk = char;
        } else {
          chunk = nextChunk;
        }
      }
      currentLine = chunk;
    }

    if (currentLine) resultLines.push(currentLine);
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
 * Includes withDescription, darkTheme, and font flags so option changes invalidate the cache.
 */
export function computeCardSourceHash(
  title: string,
  excerpt: string,
  url: string,
  authorId?: string,
  templateVersion: string = TEMPLATE_VERSION,
  withDescription = false,
  darkTheme = true,
  font = DEFAULT_CARD_FONT
): string {
  const payload = `${templateVersion}|${title}|${excerpt}|${url}|${authorId || ""}|desc:${withDescription}|dark:${darkTheme}|font:${font}`;
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
    bg: COLOR_BLACK,
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
    bg: COLOR_LIGHT_SURFACE,
    borderColor: COLOR_INDIGO_VIOLET,
    brand: COLOR_INDIGO_VIOLET,
    separator: COLOR_TEXT_MUTED,
    authorName: COLOR_TEXT_PRIMARY_LIGHT,
    title: COLOR_TEXT_PRIMARY_LIGHT,
    excerpt: COLOR_TEXT_PRIMARY_LIGHT,
    urlIntro: COLOR_INDIGO_VIOLET,
    urlLabel: COLOR_INDIGO_VIOLET,
    divider: COLOR_INDIGO_VIOLET,
    dividerOpacity: "0.18",
  };
}

// ─── CSS style block ──────────────────────────────────────────────────────────

function buildStyles(c: ThemeColors, font: string = CARD_FONT_FAMILY): string {
  return `
      .cogmit-card-svg { width: 100%; height: auto; max-width: 100%; box-sizing: border-box; display: block; font-family: ${font}; }
      .cogmit-card-svg text, .cogmit-card-svg tspan { font-family: ${font}; text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased; }
      .cogmit-card-svg .bg, .bg { fill: ${c.bg}; }
      .cogmit-card-svg .outer-border, .outer-border { fill: none; stroke: ${c.borderColor}; stroke-width: 3; }
      .cogmit-card-svg .brand, .brand { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.brand}; letter-spacing: 3px; }
      .cogmit-card-svg .sep, .sep   { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.separator}; letter-spacing: 0; }
      .cogmit-card-svg .author-name, .author-name { font-family: ${font}; font-size: ${FONT_HEADER_SIZE}px; font-weight: ${FONT_HEADER_WEIGHT}; fill: ${c.authorName}; letter-spacing: 0; }
      .cogmit-card-svg .title-container, .cogmit-card-svg .title, .title-container, .title { font-family: ${font}; font-size: ${FONT_TITLE_SIZE}px; font-weight: ${FONT_TITLE_WEIGHT}; fill: ${c.title}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .cogmit-card-svg .description-container, .cogmit-card-svg .excerpt, .description-container, .excerpt { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.excerpt}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .cogmit-card-svg .url-intro, .url-intro { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.urlIntro}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .cogmit-card-svg .url-label, .url-label { font-family: ${font}; font-size: ${FONT_BODY_SIZE}px; font-weight: ${FONT_BODY_WEIGHT}; fill: ${c.urlLabel}; width: 100%; max-width: 100%; box-sizing: border-box; }
      .cogmit-card-svg .divider, .divider { stroke: ${c.divider}; stroke-width: 1.5; stroke-opacity: ${c.dividerOpacity}; }`.trimStart();
}

// ─── Header SVG fragment ──────────────────────────────────────────────────────

/**
 * Author header: COGMIT | username
 * Symmetrical spacing: equal dx on both sides of " | "
 */
function buildHeader(paddingX: number, headerY: number, safeUsername: string, font: string = CARD_FONT_FAMILY): string {
  // Each side of " | " gets the same dx (12px), giving equal optical distance
  return `<text x="${paddingX}" y="${headerY}" font-family="${font}">
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

// ─── Footer SVG fragment (single row: View & Listen full @  <domain>) ───────────────

function buildFooter(
  paddingX: number,
  divider2Y: number,
  footerY: number,
  width: number,
  displayDomain: string,
  font: string = CARD_FONT_FAMILY
): string {
  const safeDomain = escapeXml(displayDomain);
  return `
  <!-- Footer divider -->
  <line x1="${paddingX}" y1="${divider2Y}" x2="${width - paddingX}" y2="${divider2Y}" class="divider" />

  <!-- Footer: View & Listen full @  domain (same line) -->
  <text x="${paddingX}" y="${footerY}" class="url-intro" font-family="${font}">View & Listen full @  <tspan class="url-label">${safeDomain}</tspan></text>`;
}

// ─── Portrait card (3:4, with description) ────────────────────────────────────

function generatePortraitSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, excerpt, url, authorId } = opts;
  const font = resolveCardFontStack(opts.font || opts.fontFamily);

  const width = CARD_WIDTH_PORTRAIT;
  const height = CARD_HEIGHT_PORTRAIT;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayDomain = getCanonicalDomain(url);

  // Geometry is scaled for the exact 969 × 1292 portrait canvas.
  const paddingX = 65;
  const borderInset = 26;
  const borderRadius = 20;

  const usableWidth = width - paddingX * 2;
  const isVerdana = !opts.font || opts.font.toLowerCase().includes("verdana") || font.toLowerCase().includes("verdana");
  // Keep the larger safety inset for Verdana as the visual baseline reference,
  // while allowing Arial and Times New Roman to naturally utilize the intended content width.
  const maxTextWidth = isVerdana ? usableWidth - 48 : usableWidth - 16;

  // Measure title at its actual semibold weight and body at regular weight.
  const titleLines = wrapTextByWidth(
    title || "Untitled Cogmit",
    maxTextWidth,
    FONT_TITLE_SIZE,
    true,
    font
  );
  const excerptLines = excerpt
    ? wrapTextByWidth(excerpt, maxTextWidth, FONT_BODY_SIZE, false, font)
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

  // The description must stop above the footer divider, never overflow it.
  const availableExcerptHeight = Math.max(0, divider2Y - excerptStartY - 28);
  const maxExcerptLines = Math.floor(availableExcerptHeight / excerptLineHeight);
  if (excerptLines.length > maxExcerptLines) {
    excerptLines.length = maxExcerptLines;
    if (excerptLines.length > 0) {
      const lastIndex = excerptLines.length - 1;
      let lastLine = excerptLines[lastIndex].replace(/[\s.]+$/, "");
      while (lastLine && estimateStringWidth(`${lastLine}...`, FONT_BODY_SIZE, false, font) > maxTextWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      excerptLines[lastIndex] = `${lastLine}...`;
    }
  }

  const titleTspans = buildTspans(titleLines, paddingX, titleLineHeight);
  const excerptTspans = buildTspans(excerptLines, paddingX, excerptLineHeight);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" class="cogmit-card-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${font}" style="width: 100%; height: auto; display: block; max-width: 100%; box-sizing: border-box; font-family: ${font};">
  <defs>
    <style>${buildStyles(c, font)}</style>
    <clipPath id="portrait-title-clip"><rect x="${paddingX}" y="${titleStartY - FONT_TITLE_SIZE}" width="${maxTextWidth}" height="${Math.max(1, divider1Y - titleStartY + FONT_TITLE_SIZE - 8)}" /></clipPath>
    <clipPath id="portrait-excerpt-clip"><rect x="${paddingX}" y="${excerptStartY - FONT_BODY_SIZE}" width="${maxTextWidth}" height="${Math.max(1, divider2Y - excerptStartY - 20)}" /></clipPath>
  </defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername, font)}

  <!-- Divider below header -->
  <line x1="${paddingX}" y1="${headerDividerY}" x2="${width - paddingX}" y2="${headerDividerY}" class="divider" />

  <!-- Cog title/content -->
  <text x="${paddingX}" y="${titleStartY}" class="title" clip-path="url(#portrait-title-clip)" font-family="${font}">
    ${titleTspans}
  </text>

  <!-- Divider below title -->
  <line x1="${paddingX}" y1="${divider1Y}" x2="${width - paddingX}" y2="${divider1Y}" class="divider" />

  <!-- Cog description -->
  <text x="${paddingX}" y="${excerptStartY}" class="excerpt" clip-path="url(#portrait-excerpt-clip)" font-family="${font}">
    ${excerptTspans}
  </text>
  ${buildFooter(paddingX, divider2Y, footerY, width, displayDomain, font)}
</svg>`;
}

// ─── Landscape card (3:2, no description) ────────────────────────────────────

function generateLandscapeSvg(opts: CardTemplateOptions, c: ThemeColors): string {
  const { title, url, authorId } = opts;
  const font = resolveCardFontStack(opts.font || opts.fontFamily);

  const width = CARD_WIDTH_LANDSCAPE;
  const height = CARD_HEIGHT_LANDSCAPE;

  const safeUsername = escapeXml(authorId ? authorId.toLowerCase() : "");
  const displayDomain = getCanonicalDomain(url);

  // Geometry is scaled for the exact 969 × 646 landscape canvas.
  const paddingX = 65;
  const borderInset = 26;
  const borderRadius = 20;

  const usableWidth = width - paddingX * 2;
  const isVerdana = !opts.font || opts.font.toLowerCase().includes("verdana") || font.toLowerCase().includes("verdana");
  const maxTextWidth = isVerdana ? usableWidth - 48 : usableWidth - 16;

  const titleLines = wrapTextByWidth(
    title || "Untitled Cogmit",
    maxTextWidth,
    FONT_TITLE_SIZE,
    true,
    font
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
<svg xmlns="http://www.w3.org/2000/svg" class="cogmit-card-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${font}" style="width: 100%; height: auto; display: block; max-width: 100%; box-sizing: border-box; font-family: ${font};">
  <defs>
    <style>${buildStyles(c, font)}</style>
    <clipPath id="landscape-title-clip"><rect x="${paddingX}" y="${headerDividerY + 12}" width="${maxTextWidth}" height="${Math.max(1, divider2Y - headerDividerY - 28)}" /></clipPath>
  </defs>

  <!-- Card surface -->
  <rect width="${width}" height="${height}" class="bg" />

  <!-- YV Indigo Violet outer border -->
  <rect x="${borderInset}" y="${borderInset}" width="${width - borderInset * 2}" height="${height - borderInset * 2}" rx="${borderRadius}" class="outer-border" />

  <!-- Header: COGMIT | username -->
  ${buildHeader(paddingX, headerY, safeUsername, font)}

  <!-- Divider below header -->
  <line x1="${paddingX}" y1="${headerDividerY}" x2="${width - paddingX}" y2="${headerDividerY}" class="divider" />

  <!-- Cog title/content; no divider below title in Landscape -->
  <text x="${paddingX}" y="${titleStartY}" class="title" clip-path="url(#landscape-title-clip)" font-family="${font}">
    ${titleTspans}
  </text>

  ${buildFooter(paddingX, divider2Y, footerY, width, displayDomain, font)}
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
        const fontMatch = svgString.match(/font-family:\s*([^;]+);/);
        const activeFont = fontMatch ? fontMatch[1].trim() : CARD_FONT_FAMILY;
        ctx.font = `400 ${FONT_BODY_SIZE}px ${activeFont}`;

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
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_DELAY_MS);
}
