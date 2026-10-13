/**
 * Excerpt extraction utility for RootCog content.
 * Follows strict YVS and Cogmit rules:
 * - Uses actual RootCog content, preserving original wording.
 * - Enforces a hard maximum of 200 characters.
 * - Handles empty content, short content, Markdown syntax, Unicode, and whitespace safely.
 * - Does not append an ellipsis if doing so would exceed the 200-character limit.
 * - Does not rewrite or synthesize text.
 */

export const MAX_EXCERPT_LENGTH = 200;

/**
 * Strips Markdown formatting while preserving the author's original words.
 */
export function stripMarkdown(content: string, title?: string): string {
  if (!content) return "";

  let text = content;

  // 1. Remove fenced code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, " ");

  // 2. Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  // 3. Remove images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "");

  // 4. Split into lines to safely handle line-level syntax (headings, list items, quotes)
  const lines = text.split(/\r?\n/);
  const cleanedLines: string[] = [];

  const normalizedTitle = title ? title.trim().toLowerCase() : "";

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Skip the line if it is just a top-level heading repeating the cog's title
    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, "").trim();
      if (normalizedTitle && headingText.toLowerCase() === normalizedTitle) {
        continue;
      }
      trimmed = headingText;
    }

    // Remove blockquotes '> '
    trimmed = trimmed.replace(/^>\s*/, "");

    // Remove list markers (- , * , + , 1. )
    trimmed = trimmed.replace(/^[-*+]\s+/, "");
    trimmed = trimmed.replace(/^\d+\.\s+/, "");

    // Remove task list checkboxes ([ ] or [x])
    trimmed = trimmed.replace(/^\[[ xX]\]\s+/, "");

    // Remove horizontal rules
    if (/^[-*_]{3,}$/.test(trimmed)) {
      continue;
    }

    if (trimmed) {
      cleanedLines.push(trimmed);
    }
  }

  text = cleanedLines.join(" ");

  // 5. Replace Markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 6. Remove reference-style links [text][ref] -> text
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

  // 7. Remove link definitions [ref]: url
  text = text.replace(/^\[[^\]]+\]:\s*\S+/gm, "");

  // 8. Replace inline code `code` -> code
  text = text.replace(/`([^`]+)`/g, "$1");

  // 9. Replace bold/italic markers
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // 10. Strip basic HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // 11. Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extracts a self-contained excerpt of up to maxLength characters (default 200).
 * Guaranteed to never exceed maxLength characters, including any ellipsis.
 */
export function extractExcerpt(
  content: string,
  maxLength: number = MAX_EXCERPT_LENGTH,
  title?: string
): string {
  if (!content) return "";

  const stripped = stripMarkdown(content, title);
  if (!stripped) return "";

  // Convert to array of Unicode characters / code points so emojis & surrogate pairs aren't sliced in half
  const chars = Array.from(stripped);

  // If already at or under the limit, return as is (no ellipsis)
  if (chars.length <= maxLength) {
    return stripped;
  }

  // If length > maxLength, we must truncate to at most maxLength characters including ellipsis.
  // We use single character ellipsis '…' (length 1)
  const ellipsis = "…";
  const targetChars = maxLength - 1; // leave 1 character for ellipsis

  // Take the first targetChars characters
  const truncatedChars = chars.slice(0, targetChars);
  let truncatedStr = truncatedChars.join("");

  // Look for the last space within the last 30 characters to avoid splitting words awkwardly
  const lastSpaceIndex = truncatedStr.lastIndexOf(" ");
  if (lastSpaceIndex > targetChars - 30 && lastSpaceIndex > 0) {
    truncatedStr = truncatedStr.slice(0, lastSpaceIndex);
  }

  // Strip trailing punctuation like comma, colon, semicolon, hyphen before ellipsis
  truncatedStr = truncatedStr.replace(/[,:;\-\s]+$/, "");

  const result = `${truncatedStr}${ellipsis}`;

  // Strict invariant check: result.length must never exceed maxLength
  if (Array.from(result).length > maxLength) {
    return chars.slice(0, maxLength).join("");
  }

  return result;
}
