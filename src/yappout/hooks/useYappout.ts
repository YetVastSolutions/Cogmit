'use client';
// src/yappout/hooks/useYappout.ts
// Central React hook for Yappout TTS + synchronized reading

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { buildReadingSequence, ReadingSequence } from '../core/readingSequence';
import { buildWordDOMMap, WordDOMMap, findWordIndexFromCaretRange } from '../core/wordTracker';
import { scrollWordIntoView } from '../core/scrollController';
import { speakWordByWord } from '../core/playbackController';
import { SPEED_CYCLE, DEFAULT_SPEED_IDX, getSpeedLabel, getSpeed, nextSpeedIdx } from '../core/speedController';
import { attachDoubleTapHandler } from '../utils/doubleTapDetector';

export type PlaybackState = 'idle' | 'playing' | 'stopped' | 'completed';

interface UseYappoutOptions {
  title: string;
  content: string;
  titleRef: RefObject<HTMLElement | null>;
  bodyRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

interface UseYappoutReturn {
  playbackState: PlaybackState;
  currentWordIndex: number;
  readingSequence: ReadingSequence;
  speed: number;
  speedLabel: string;
  activeRange: Range | null;
  wordDOMMap: WordDOMMap;
  play: () => void;
  stop: () => void;
  seekTo: (wordIndex: number) => void;
  cycleSpeed: () => void;
}

export function useYappout({
  title,
  content,
  titleRef,
  bodyRef,
  scrollContainerRef,
}: UseYappoutOptions): UseYappoutReturn {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [speedCycleIdx, setSpeedCycleIdx] = useState(DEFAULT_SPEED_IDX);
  const [wordDOMMap, setWordDOMMap] = useState<WordDOMMap>([]);

  // Purely derived reading sequence
  const readingSequence = useMemo(() => {
    if (!title && !content) return { words: [], titleWordCount: 0 };
    return buildReadingSequence(title, content);
  }, [title, content]);

  // Purely derived active Range based on wordDOMMap and currentWordIndex
  const activeRange = useMemo(() => {
    if (playbackState !== 'playing') return null;
    const entry = wordDOMMap.find((e) => e.wordIndex === currentWordIndex);
    return entry ? entry.range : null;
  }, [playbackState, currentWordIndex, wordDOMMap]);

  // Stable refs for event callbacks & session guards
  const sessionIdRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>('idle');
  const currentWordIndexRef = useRef(0);
  const speedRef = useRef<number>(SPEED_CYCLE[DEFAULT_SPEED_IDX]);
  const readingSequenceRef = useRef<ReadingSequence>(readingSequence);

  useEffect(() => {
    readingSequenceRef.current = readingSequence;
  }, [readingSequence]);

  // Keep state refs in sync
  const updatePlaybackState = useCallback((state: PlaybackState) => {
    playbackStateRef.current = state;
    setPlaybackState(state);
  }, []);

  const updateCurrentWordIndex = useCallback((idx: number) => {
    currentWordIndexRef.current = idx;
    setCurrentWordIndex(idx);
  }, []);

  // When content changes, cancel any ongoing playback and reset state
  const prevContentKeyRef = useRef(`${title}:::${content}`);
  useEffect(() => {
    const currentKey = `${title}:::${content}`;
    if (prevContentKeyRef.current !== currentKey) {
      prevContentKeyRef.current = currentKey;
      sessionIdRef.current++;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      updatePlaybackState('idle');
      updateCurrentWordIndex(0);
    }
  }, [title, content, updatePlaybackState, updateCurrentWordIndex]);

  // Clean up on component unmount
  useEffect(() => {
    const session = sessionIdRef;
    return () => {
      session.current++;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Rebuild DOM map after sequence changes with a debounce to allow DOM rendering
  useEffect(() => {
    if (readingSequence.words.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const map = buildWordDOMMap(
        titleRef.current,
        bodyRef.current,
        readingSequence.words,
      );
      setWordDOMMap(map);
    }, 150);
    return () => clearTimeout(timer);
  }, [readingSequence, titleRef, bodyRef]);

  // Auto-scroll active word into view within scrollContainer
  useEffect(() => {
    if (activeRange && scrollContainerRef.current) {
      scrollWordIntoView(activeRange, scrollContainerRef.current);
    }
  }, [activeRange, scrollContainerRef]);

  // Core play function with session ID guard
  const doPlay = useCallback(
    (fromIndex: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const sessionId = ++sessionIdRef.current;
      updatePlaybackState('playing');

      speakWordByWord(
        readingSequenceRef.current.words,
        fromIndex,
        speedRef.current,
        sessionId,
        () => sessionIdRef.current,
        {
          onWordChange: (idx) => {
            updateCurrentWordIndex(idx);
          },
          onComplete: () => {
            updatePlaybackState('completed');
            updateCurrentWordIndex(0);
          },
        },
      );
    },
    [updatePlaybackState, updateCurrentWordIndex],
  );

  const play = useCallback(() => {
    if (playbackStateRef.current === 'playing') return;
    const startIdx =
      playbackStateRef.current === 'completed' ? 0 : currentWordIndexRef.current;
    doPlay(startIdx);
  }, [doPlay]);

  const stop = useCallback(() => {
    sessionIdRef.current++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    updatePlaybackState('stopped');
    updateCurrentWordIndex(0);
  }, [updatePlaybackState, updateCurrentWordIndex]);

  const seekTo = useCallback(
    (wordIndex: number) => {
      sessionIdRef.current++;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      doPlay(wordIndex);
    },
    [doPlay],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedCycleIdx((prev) => {
      const next = nextSpeedIdx(prev);
      speedRef.current = SPEED_CYCLE[next];

      // If playing, restart from current word with new speed
      if (playbackStateRef.current === 'playing') {
        const currentIdx = currentWordIndexRef.current;
        setTimeout(() => {
          if (playbackStateRef.current === 'playing') {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            const newSessionId = ++sessionIdRef.current;
            speakWordByWord(
              readingSequenceRef.current.words,
              currentIdx,
              speedRef.current,
              newSessionId,
              () => sessionIdRef.current,
              {
                onWordChange: (idx) => updateCurrentWordIndex(idx),
                onComplete: () => {
                  updatePlaybackState('completed');
                  updateCurrentWordIndex(0);
                },
              },
            );
          }
        }, 0);
      }

      return next;
    });
  }, [updatePlaybackState, updateCurrentWordIndex]);

  // Attach double-click / double-tap handlers for word seeking
  useEffect(() => {
    const titleEl = titleRef.current;
    const bodyEl = bodyRef.current;

    function handleDoubleTap(x: number, y: number) {
      const caretRange = getCaretRangeFromPoint(x, y);
      if (!caretRange) return;
      const wordIndex = findWordIndexFromCaretRange(caretRange, wordDOMMap);
      if (wordIndex !== -1) {
        seekTo(wordIndex);
      }
    }

    const cleanups: (() => void)[] = [];
    if (titleEl) cleanups.push(attachDoubleTapHandler(titleEl, handleDoubleTap));
    if (bodyEl) cleanups.push(attachDoubleTapHandler(bodyEl, handleDoubleTap));

    return () => cleanups.forEach((fn) => fn());
  }, [titleRef, bodyRef, wordDOMMap, seekTo]);

  const speed = getSpeed(speedCycleIdx);
  const speedLabel = getSpeedLabel(speedCycleIdx);

  return {
    playbackState,
    currentWordIndex,
    readingSequence,
    speed,
    speedLabel,
    activeRange,
    wordDOMMap,
    play,
    stop,
    seekTo,
    cycleSpeed,
  };
}

/**
 * Cross-browser helper to get caret Range from screen coordinates.
 */
function getCaretRangeFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(x, y);
  }
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
  }
  return null;
}
