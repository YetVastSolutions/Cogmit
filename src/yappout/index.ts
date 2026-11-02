// src/yappout/index.ts
// Public exports for the Yappout module

export { useYappout } from './hooks/useYappout';
export type { PlaybackState, UseYappoutReturn } from './hooks/useYappout';

export { YappoutButton } from './components/YappoutButton';
export { YappoutSpeed } from './components/YappoutSpeed';
export { YappoutWord } from './components/YappoutWord';
export { YappoutSegment } from './components/YappoutSegment';
export { YappoutHighlight } from './components/YappoutHighlight';

export { buildReadingSequence } from './core/readingSequence';
export type { ReadingSequence } from './core/readingSequence';

export {
  buildSegmentDOMMap,
  findSegmentIndexFromCaretRange,
  buildWordDOMMap,
  findWordIndexFromCaretRange,
} from './core/wordTracker';
export type {
  SegmentDOMMap,
  SegmentDOMEntry,
  WordDOMMap,
  WordDOMEntry,
} from './core/wordTracker';

export { scrollSegmentIntoView, scrollWordIntoView } from './core/scrollController';
export { speakSegmentBySegment, speakWordByWord } from './core/playbackController';
export type { SegmentPlaybackCallbacks, WordPlaybackCallbacks } from './core/playbackController';
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
export { tokenizeText, segmentText, normalizeWhitespace } from './utils/textNormalizer';
export type { WordToken, SegmentToken } from './utils/textNormalizer';
export { attachDoubleTapHandler } from './utils/doubleTapDetector';
export { createSpeechSynthesisAdapter } from './adapters/speechSynthesisAdapter';
export type { SpeechAdapter } from './adapters/speechSynthesisAdapter';
export { extractCogmitContent } from './adapters/cogmitContentAdapter';
export type { CogmitContent } from './adapters/cogmitContentAdapter';
