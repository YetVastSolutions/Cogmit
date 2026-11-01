// src/yappout/core/playbackController.ts
// Session-based word-by-word playback controller

import { WordToken } from '../utils/textNormalizer';

export type PlaybackState = 'idle' | 'playing' | 'stopped' | 'completed';

interface PlaybackCallbacks {
  onWordChange: (wordIndex: number) => void;
  onComplete: () => void;
}

/**
 * Speaks words one at a time using Web Speech API.
 * Each word is a separate utterance for reliable word-level sync.
 * Stale sessions are ignored via sessionId guard.
 */
export function speakWordByWord(
  words: WordToken[],
  startIndex: number,
  rate: number,
  sessionId: number,
  getSessionId: () => number,
  callbacks: PlaybackCallbacks,
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

