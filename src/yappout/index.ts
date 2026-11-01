// src/yappout/index.ts
// Public exports for the Yappout module

export { useYappout } from './hooks/useYappout';
export type { PlaybackState } from './hooks/useYappout';

export { YappoutButton } from './components/YappoutButton';
export { YappoutSpeed } from './components/YappoutSpeed';
export { YappoutWord } from './components/YappoutWord';
export { YappoutHighlight } from './components/YappoutHighlight';

export { buildReadingSequence } from './core/readingSequence';
export type { ReadingSequence } from './core/readingSequence';

export { buildWordDOMMap, findWordIndexFromCaretRange } from './core/wordTracker';
export type { WordDOMMap, WordDOMEntry } from './core/wordTracker';

export { scrollWordIntoView } from './core/scrollController';
export { speakWordByWord } from './core/playbackController';
export {
  SPEED_CYCLE,
  SPEED_LABELS,
  DEFAULT_SPEED_IDX,
  getSpeed,
  getSpeedLabel,
  nextSpeedIdx,
} from './core/speedController';
export type { SpeedValue } from './core/speedController';

export { stripMarkdown, extractMarkdownParagraphs } from './utils/markdownExtractor';
export { tokenizeText, normalizeWhitespace } from './utils/textNormalizer';
export type { WordToken } from './utils/textNormalizer';
export { attachDoubleTapHandler } from './utils/doubleTapDetector';
export { createSpeechSynthesisAdapter } from './adapters/speechSynthesisAdapter';
export type { SpeechAdapter } from './adapters/speechSynthesisAdapter';
export { extractCogmitContent } from './adapters/cogmitContentAdapter';
export type { CogmitContent } from './adapters/cogmitContentAdapter';
