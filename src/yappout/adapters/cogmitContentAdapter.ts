// src/yappout/adapters/cogmitContentAdapter.ts
// Extracts title and content text from cogmit mode for Yappout

export interface CogmitContent {
  title: string;
  content: string;
}

/**
 * Returns the title and content as-is.
 * The title is plain text (no markdown).
 * The content is raw markdown (will be processed by textNormalizer).
 */
export function extractCogmitContent(title: string, content: string): CogmitContent {
  return { title: title.trim(), content };
}

