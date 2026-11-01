// src/yappout/utils/textNormalizer.ts
// Tokenizes text for Yappout reading sequence and word tracking

export interface WordToken {
  index: number;       // global word index across title + body
  text: string;        // the word text (including attached punctuation/apostrophes)
  section: 'title' | 'body';
}

/**
 * Strips markdown syntax from raw markdown text, preserving readable words and punctuation.
 * Uses [\s\S]*? instead of the `s` dotAll flag for ES2017 compatibility.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  // Remove fenced code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]*`/g, '');
  // Remove images (keep alt text)
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove links (keep link text)
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove heading hashes
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove bold markers (**text** and __text__)
  text = text.replace(/\*\*([\s\S]*?)\*\*/g, '$1');
  text = text.replace(/__([\s\S]*?)__/g, '$1');
  // Remove italic markers (*text* and _text_)
  text = text.replace(/\*([\s\S]*?)\*/g, '$1');
  text = text.replace(/_([\s\S]*?)_/g, '$1');
  // Remove strikethrough
  text = text.replace(/~~([\s\S]*?)~~/g, '$1');
  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return text;
}

/**
 * Normalizes and cleans whitespace while preserving contractions and punctuation.
 */
export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Tokenizes plain text into sequential WordTokens.
 * Splits on whitespace, keeping punctuation and apostrophes attached to words.
 */
export function tokenizeText(
  text: string,
  section: 'title' | 'body',
  startIndex: number,
): WordToken[] {
  const tokens: WordToken[] = [];
  const parts = text.split(/\s+/);
  let idx = startIndex;
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    tokens.push({ index: idx++, text: trimmed, section });
  }
  return tokens;
}
