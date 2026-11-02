'use client';
// src/yappout/hooks/useYappout.ts
// Central React hook for Yappout TTS + synchronized segment reading

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { buildReadingSequence, ReadingSequence } from '../core/readingSequence';
import {
  buildSegmentDOMMap,
  SegmentDOMMap,
  findSegmentIndexFromCaretRange,
  buildWordDOMMap,
  WordDOMMap,
  findWordIndexFromCaretRange,
} from '../core/wordTracker';
import { scrollSegmentIntoView } from '../core/scrollController';
import { speakSegmentBySegment } from '../core/playbackController';
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

export interface UseYappoutReturn {
  playbackState: PlaybackState;
  currentSegmentIndex: number;
  currentWordIndex: number; // alias for backward compatibility
  readingSequence: ReadingSequence;
  speed: number;
  speedLabel: string;
  activeRange: Range | null;
  segmentDOMMap: SegmentDOMMap;
  wordDOMMap: WordDOMMap; // alias for backward compatibility
  play: () => void;
  stop: () => void;
  seekTo: (segmentIndex: number) => void;
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
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [speedCycleIdx, setSpeedCycleIdx] = useState(DEFAULT_SPEED_IDX);
  const [segmentDOMMap, setSegmentDOMMap] = useState<SegmentDOMMap>([]);
  const [wordDOMMap, setWordDOMMap] = useState<WordDOMMap>([]);

  // Purely derived reading sequence containing segments and words
  const readingSequence = useMemo(() => {
    if (!title && !content) {
      return {
        segments: [],
        titleSegmentCount: 0,
        words: [],
        titleWordCount: 0,
      };
    }
    return buildReadingSequence(title, content);
  }, [title, content]);

  // One authoritative active Range based on segmentDOMMap and currentSegmentIndex
  const activeRange = useMemo(() => {
    if (playbackState !== 'playing') return null;
    const entry = segmentDOMMap.find((e) => e.segmentIndex === currentSegmentIndex);
    return entry ? entry.range : null;
  }, [playbackState, currentSegmentIndex, segmentDOMMap]);

  // Stable refs for event callbacks & session guards
  const sessionIdRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>('idle');
  const currentSegmentIndexRef = useRef(0);
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

  const updateCurrentSegmentIndex = useCallback((idx: number) => {
    currentSegmentIndexRef.current = idx;
    setCurrentSegmentIndex(idx);
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
      updateCurrentSegmentIndex(0);
    }
  }, [title, content, updatePlaybackState, updateCurrentSegmentIndex]);

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
    if (readingSequence.segments.length === 0 && readingSequence.words.length === 0) {
      setSegmentDOMMap([]);
      setWordDOMMap([]);
      return;
    }
    const timer = setTimeout(() => {
      const segMap = buildSegmentDOMMap(
        titleRef.current,
        bodyRef.current,
        readingSequence.segments,
      );
      setSegmentDOMMap(segMap);

      const wMap = buildWordDOMMap(
        titleRef.current,
        bodyRef.current,
        readingSequence.words,
      );
      setWordDOMMap(wMap);
    }, 150);
    return () => clearTimeout(timer);
  }, [readingSequence, titleRef, bodyRef]);

  // Auto-scroll active segment into view within scrollContainer
  useEffect(() => {
    if (activeRange && scrollContainerRef.current) {
      scrollSegmentIntoView(activeRange, scrollContainerRef.current);
    }
  }, [activeRange, scrollContainerRef]);

  // Core play function with session ID guard
  const doPlay = useCallback(
    (fromIndex: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const sessionId = ++sessionIdRef.current;
      updatePlaybackState('playing');

      speakSegmentBySegment(
        readingSequenceRef.current.segments,
        fromIndex,
        speedRef.current,
        sessionId,
        () => sessionIdRef.current,
        {
          onSegmentChange: (idx) => {
            updateCurrentSegmentIndex(idx);
          },
          onComplete: () => {
            updatePlaybackState('completed');
            updateCurrentSegmentIndex(0);
          },
        },
      );
    },
    [updatePlaybackState, updateCurrentSegmentIndex],
  );

  const play = useCallback(() => {
    if (playbackStateRef.current === 'playing') return;
    const startIdx =
      playbackStateRef.current === 'completed' ? 0 : currentSegmentIndexRef.current;
    doPlay(startIdx);
  }, [doPlay]);

  const stop = useCallback(() => {
    sessionIdRef.current++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    updatePlaybackState('stopped');
    updateCurrentSegmentIndex(0);
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  const seekTo = useCallback(
    (segmentIndex: number) => {
      sessionIdRef.current++;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      updateCurrentSegmentIndex(segmentIndex);
      doPlay(segmentIndex);
    },
    [doPlay, updateCurrentSegmentIndex],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedCycleIdx((prev) => {
      const next = nextSpeedIdx(prev);
      speedRef.current = SPEED_CYCLE[next];

      // If playing, restart from current segment with new speed
      if (playbackStateRef.current === 'playing') {
        const currentIdx = currentSegmentIndexRef.current;
        setTimeout(() => {
          if (playbackStateRef.current === 'playing') {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            const newSessionId = ++sessionIdRef.current;
            speakSegmentBySegment(
              readingSequenceRef.current.segments,
              currentIdx,
              speedRef.current,
              newSessionId,
              () => sessionIdRef.current,
              {
                onSegmentChange: (idx) => updateCurrentSegmentIndex(idx),
                onComplete: () => {
                  updatePlaybackState('completed');
                  updateCurrentSegmentIndex(0);
                },
              },
            );
          }
        }, 0);
      }

      return next;
    });
  }, [updatePlaybackState, updateCurrentSegmentIndex]);

  // Attach double-click / double-tap handlers for segment seeking
  useEffect(() => {
    const titleEl = titleRef.current;
    const bodyEl = bodyRef.current;

    function handleDoubleTap(x: number, y: number) {
      const caretRange = getCaretRangeFromPoint(x, y);
      if (caretRange) {
        const segmentIndex = findSegmentIndexFromCaretRange(caretRange, segmentDOMMap);
        if (segmentIndex !== -1) {
          seekTo(segmentIndex);
          return;
        }
      }

      // Fallback: check element under point
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const el = document.elementFromPoint(x, y);
        if (el) {
          for (const entry of segmentDOMMap) {
            try {
              if (
                entry.range.intersectsNode(el) ||
                el.contains(entry.range.commonAncestorContainer)
              ) {
                seekTo(entry.segmentIndex);
                return;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const cleanups: (() => void)[] = [];
    if (titleEl) cleanups.push(attachDoubleTapHandler(titleEl, handleDoubleTap));
    if (bodyEl) cleanups.push(attachDoubleTapHandler(bodyEl, handleDoubleTap));

    return () => cleanups.forEach((fn) => fn());
  }, [titleRef, bodyRef, segmentDOMMap, seekTo]);

  const speed = getSpeed(speedCycleIdx);
  const speedLabel = getSpeedLabel(speedCycleIdx);

  return {
    playbackState,
    currentSegmentIndex,
    currentWordIndex: currentSegmentIndex, // alias for backward compatibility
    readingSequence,
    speed,
    speedLabel,
    activeRange,
    segmentDOMMap,
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
  if (typeof window !== 'undefined' && window.getSelection) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0);
    }
  }
  return null;
}
