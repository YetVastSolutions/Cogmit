// src/yappout/core/readingSequence.ts
// Builds the ordered segment and word token sequence from title + markdown body

import {
  stripMarkdown,
  tokenizeText,
  segmentText,
  WordToken,
  SegmentToken,
} from '../utils/textNormalizer';

export interface ReadingSequence {
  segments: SegmentToken[];
  titleSegmentCount: number;
  words: WordToken[];
  titleWordCount: number;
}

/**
 * Builds a flat reading sequence combining title and body segments and tokens.
 * Title segments come first (section: 'title'), then body segments (section: 'body').
 */
export function buildReadingSequence(
  title: string,
  markdownContent: string,
): ReadingSequence {
  const trimmedTitle = title.trim();
  const bodyText = stripMarkdown(markdownContent);

  // Segment tokens for continuous playback
  const titleSegments = segmentText(trimmedTitle, 'title', 0);
  const bodySegments = segmentText(bodyText, 'body', titleSegments.length);

  // Word tokens for backwards compatibility
  const titleTokens = tokenizeText(trimmedTitle, 'title', 0);
  const bodyTokens = tokenizeText(bodyText, 'body', titleTokens.length);

  return {
    segments: [...titleSegments, ...bodySegments],
    titleSegmentCount: titleSegments.length,
    words: [...titleTokens, ...bodyTokens],
    titleWordCount: titleTokens.length,
  };
}

