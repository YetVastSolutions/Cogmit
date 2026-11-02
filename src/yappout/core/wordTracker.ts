// src/yappout/core/wordTracker.ts
// Builds DOM range map by walking text nodes in title + body containers

import { WordToken, SegmentToken } from '../utils/textNormalizer';

export interface WordDOMEntry {
  wordIndex: number;
  range: Range;
}

export type WordDOMMap = WordDOMEntry[];

export interface SegmentDOMEntry {
  segmentIndex: number;
  range: Range;
  text: string;
}

export type SegmentDOMMap = SegmentDOMEntry[];

/**
 * Walk all text nodes in container element.
 */
function collectTextNodes(el: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node as Text).textContent || '';
    if (text.trim().length > 0) {
      nodes.push(node as Text);
    }
  }
  return nodes;
}

interface FlatText {
  text: string;
  nodeOffsets: { node: Text; start: number; end: number }[];
}

function flattenTextNodes(nodes: Text[]): FlatText {
  let text = '';
  const nodeOffsets: FlatText['nodeOffsets'] = [];
  for (const node of nodes) {
    const nodeText = node.textContent || '';
    nodeOffsets.push({ node, start: text.length, end: text.length + nodeText.length });
    text += nodeText;
  }
  return { text, nodeOffsets };
}

function createRangeForOffset(flat: FlatText, start: number, length: number): Range | null {
  const end = start + length;
  const range = document.createRange();

  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const entry of flat.nodeOffsets) {
    if (startNode === null && entry.end > start) {
      startNode = entry.node;
      startOffset = start - entry.start;
    }
    if (endNode === null && entry.end >= end) {
      endNode = entry.node;
      endOffset = end - entry.start;
      break;
    }
  }

  if (!startNode || !endNode) return null;

  try {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch {
    return null;
  }
}

/**
 * Builds a WordDOMMap by sequentially matching word tokens against
 * the flattened text of the title and body DOM containers.
 * Uses a cursor-based approach to correctly handle repeated words.
 */
export function buildWordDOMMap(
  titleEl: HTMLElement | null,
  bodyEl: HTMLElement | null,
  words: WordToken[],
): WordDOMMap {
  const result: WordDOMMap = [];

  const titleFlat = flattenTextNodes(titleEl ? collectTextNodes(titleEl) : []);
  const bodyFlat = flattenTextNodes(bodyEl ? collectTextNodes(bodyEl) : []);

  let titleCursor = 0;
  let bodyCursor = 0;

  for (const word of words) {
    const flat = word.section === 'title' ? titleFlat : bodyFlat;
    const cursor = word.section === 'title' ? titleCursor : bodyCursor;

    const idx = flat.text.indexOf(word.text, cursor);
    if (idx !== -1) {
      const range = createRangeForOffset(flat, idx, word.text.length);
      if (range) {
        result.push({ wordIndex: word.index, range });
        if (word.section === 'title') {
          titleCursor = idx + word.text.length;
        } else {
          bodyCursor = idx + word.text.length;
        }
      }
    }
  }

  return result;
}

/**
 * Given a caret Range from caretRangeFromPoint, find the best matching word index.
 */
export function findWordIndexFromCaretRange(
  caretRange: Range,
  wordDOMMap: WordDOMMap,
): number {
  const caretNode = caretRange.startContainer;
  const caretOffset = caretRange.startOffset;

  for (const entry of wordDOMMap) {
    const { range } = entry;
    try {
      // Check if caret node is within this word's range
      const startCmp = range.comparePoint(caretNode, caretOffset);
      if (startCmp === 0) {
        return entry.wordIndex;
      }
    } catch {
      // comparePoint can throw if nodes are from different documents
    }
  }

  // Fallback: find nearest word by checking node containment
  for (const entry of wordDOMMap) {
    const { range } = entry;
    try {
      if (range.startContainer === caretNode || range.endContainer === caretNode) {
        return entry.wordIndex;
      }
    } catch {
      // ignore
    }
  }

  return -1;
}

/**
 * Builds a SegmentDOMMap by matching segment tokens against
 * the flattened text of the title and body DOM containers.
 * Employs exact string matching first, with tokenized word-sequence fallback
 * to handle browser HTML whitespace or line break formatting variations.
 */
export function buildSegmentDOMMap(
  titleEl: HTMLElement | null,
  bodyEl: HTMLElement | null,
  segments: SegmentToken[],
): SegmentDOMMap {
  const result: SegmentDOMMap = [];

  const titleFlat = flattenTextNodes(titleEl ? collectTextNodes(titleEl) : []);
  const bodyFlat = flattenTextNodes(bodyEl ? collectTextNodes(bodyEl) : []);

  let titleCursor = 0;
  let bodyCursor = 0;

  for (const segment of segments) {
    const flat = segment.section === 'title' ? titleFlat : bodyFlat;
    const cursor = segment.section === 'title' ? titleCursor : bodyCursor;

    // 1. Try exact match first
    const exactIdx = flat.text.indexOf(segment.text, cursor);
    if (exactIdx !== -1) {
      const range = createRangeForOffset(flat, exactIdx, segment.text.length);
      if (range) {
        result.push({ segmentIndex: segment.index, range, text: segment.text });
        if (segment.section === 'title') {
          titleCursor = exactIdx + segment.text.length;
        } else {
          bodyCursor = exactIdx + segment.text.length;
        }
        continue;
      }
    }

    // 2. Fallback: match by words of segment (handles whitespace/newline differences)
    const words = segment.text.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 0) {
      const firstWord = words[0];
      const startIdx = flat.text.indexOf(firstWord, cursor);
      if (startIdx !== -1) {
        let currentWordCursor = startIdx + firstWord.length;
        let matched = true;

        for (let k = 1; k < words.length; k++) {
          const w = words[k];
          const wIdx = flat.text.indexOf(w, currentWordCursor);
          if (wIdx === -1 || wIdx - currentWordCursor > 100) {
            matched = false;
            break;
          }
          currentWordCursor = wIdx + w.length;
        }

        if (matched) {
          const matchLength = currentWordCursor - startIdx;
          const range = createRangeForOffset(flat, startIdx, matchLength);
          if (range) {
            result.push({ segmentIndex: segment.index, range, text: segment.text });
            if (segment.section === 'title') {
              titleCursor = currentWordCursor;
            } else {
              bodyCursor = currentWordCursor;
            }
            continue;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Given a caret Range from caretRangeFromPoint or selection, find the best matching segment index.
 */
export function findSegmentIndexFromCaretRange(
  caretRange: Range,
  segmentDOMMap: SegmentDOMMap,
): number {
  const caretNode = caretRange.startContainer;
  const caretOffset = caretRange.startOffset;

  // 1. Standard comparePoint check
  for (const entry of segmentDOMMap) {
    const { range } = entry;
    try {
      const cmp = range.comparePoint(caretNode, caretOffset);
      if (cmp === 0) {
        return entry.segmentIndex;
      }
    } catch {
      // comparePoint can throw if nodes are in different tree contexts
    }
  }

  // 2. Node containment or intersection check
  for (const entry of segmentDOMMap) {
    const { range } = entry;
    try {
      if (
        range.startContainer === caretNode ||
        range.endContainer === caretNode ||
        (typeof range.intersectsNode === 'function' && range.intersectsNode(caretNode))
      ) {
        return entry.segmentIndex;
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback: check ancestor element containment
  try {
    const parentEl =
      caretNode.nodeType === Node.ELEMENT_NODE
        ? (caretNode as Element)
        : caretNode.parentElement;

    if (parentEl) {
      for (const entry of segmentDOMMap) {
        const common = entry.range.commonAncestorContainer;
        if (
          common === parentEl ||
          parentEl.contains(common) ||
          common.contains(parentEl)
        ) {
          return entry.segmentIndex;
        }
      }
    }
  } catch {
    // ignore
  }

  return -1;
}

