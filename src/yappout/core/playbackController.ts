// src/yappout/core/playbackController.ts
// Session-based continuous segment-by-segment playback controller

import { SegmentToken, WordToken } from '../utils/textNormalizer';

export type PlaybackState = 'idle' | 'playing' | 'stopped' | 'completed';

export interface SegmentPlaybackCallbacks {
  onSegmentChange: (segmentIndex: number) => void;
  onComplete: () => void;
}

export interface WordPlaybackCallbacks {
  onWordChange: (wordIndex: number) => void;
  onComplete: () => void;
}

/**
 * Speaks continuous text segments one after another using Web Speech API.
 * Each segment is a continuous sentence/clause ending at punctuation or line break.
 * Stale sessions are safely ignored via sessionId guard.
 */
export function speakSegmentBySegment(
  segments: SegmentToken[],
  startIndex: number,
  rate: number,
  sessionId: number,
  getSessionId: () => number,
  callbacks: SegmentPlaybackCallbacks,
): void {
  let currentIdx = startIndex;

  function speakNext(): void {
    if (getSessionId() !== sessionId) return; // stale session guard

    if (currentIdx >= segments.length) {
      callbacks.onComplete();
      return;
    }

    const segment = segments[currentIdx];
    callbacks.onSegmentChange(currentIdx);

    // If segment text is empty or only whitespace, advance to next
    if (!segment.text || segment.text.trim().length === 0) {
      currentIdx++;
      speakNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.rate = rate;
    utterance.lang = 'en-US';

    utterance.onend = () => {
      if (getSessionId() !== sessionId) return;
      currentIdx++;
      speakNext();
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (getSessionId() !== sessionId) return;
      currentIdx++;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }

  speakNext();
}

/**
 * Backward compatibility: speaks words one at a time using Web Speech API.
 */
export function speakWordByWord(
  words: WordToken[],
  startIndex: number,
  rate: number,
  sessionId: number,
  getSessionId: () => number,
  callbacks: WordPlaybackCallbacks,
): void {
  let currentIdx = startIndex;

  function speakNext(): void {
    if (getSessionId() !== sessionId) return; // stale session guard

    if (currentIdx >= words.length) {
      callbacks.onComplete();
      return;
    }

    const word = words[currentIdx];
    callbacks.onWordChange(currentIdx);

    const utterance = new SpeechSynthesisUtterance(word.text);
    utterance.rate = rate;
    utterance.lang = 'en-US';

    utterance.onend = () => {
      if (getSessionId() !== sessionId) return;
      currentIdx++;
      speakNext();
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (getSessionId() !== sessionId) return;
      currentIdx++;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }

  speakNext();
}

