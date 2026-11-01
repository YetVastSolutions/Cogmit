// src/yappout/core/readingSequence.ts
// Builds the ordered word token sequence from title + markdown body

import { stripMarkdown, tokenizeText, WordToken } from '../utils/textNormalizer';

export interface ReadingSequence {
  words: WordToken[];
  titleWordCount: number;
}

/**
 * Builds a flat reading sequence combining title tokens and body tokens.
 * Title tokens come first (section: 'title'), then body tokens (section: 'body').
 */
export function buildReadingSequence(
  title: string,
  markdownContent: string,
): ReadingSequence {
  const titleTokens = tokenizeText(title.trim(), 'title', 0);
  const bodyText = stripMarkdown(markdownContent);
  const bodyTokens = tokenizeText(bodyText, 'body', titleTokens.length);
  return {
    words: [...titleTokens, ...bodyTokens],
    titleWordCount: titleTokens.length,
  };
}

