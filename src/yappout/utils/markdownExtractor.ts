// src/yappout/utils/markdownExtractor.ts
// Markdown extraction and stripping utilities for Yappout

/**
 * Strips markdown syntax from raw markdown text, preserving actual readable words,
 * apostrophes, punctuation, and structural line breaks.
 * ES2017 compliant (avoids regex 's' dotAll flag).
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
 * Extracts plain text paragraphs from markdown.
 */
export function extractMarkdownParagraphs(markdown: string): string[] {
  const stripped = stripMarkdown(markdown);
  return stripped
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

