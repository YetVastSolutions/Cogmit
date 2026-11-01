// src/yappout/adapters/speechSynthesisAdapter.ts
// Web Speech API wrapper

export interface SpeechAdapter {
  speak(
    text: string,
    rate: number,
    onEnd: () => void,
    onBoundary: ((wordIndex: number) => void) | null,
  ): void;
  cancel(): void;
  isSupported(): boolean;
}

export function createSpeechSynthesisAdapter(): SpeechAdapter {
  return {
    isSupported() {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    },

    speak(text, rate, onEnd, onBoundary) {
      if (!this.isSupported()) {
        onEnd();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = 'en-US';

      if (onBoundary) {
        let wordCount = 0;
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            onBoundary(wordCount++);
          }
        };
      }

      utterance.onend = onEnd;
      utterance.onerror = (e) => {
        if (e.error !== 'canceled') onEnd();
      };

      window.speechSynthesis.speak(utterance);
    },

    cancel() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
  };
}

