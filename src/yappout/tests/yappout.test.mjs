// src/yappout/tests/yappout.test.mjs
// Unit tests for Yappout

import assert from 'node:assert';
import { stripMarkdown } from '../utils/markdownExtractor.ts';
import { tokenizeText, segmentText } from '../utils/textNormalizer.ts';
import {
  SPEED_CYCLE,
  SPEED_LABELS,
  DEFAULT_SPEED_IDX,
  getSpeed,
  nextSpeedIdx,
} from '../core/speedController.ts';

console.log('Running yappout/tests/yappout.test.mjs...');

// 1. Markdown stripping & punctuation
const md = '# Title\n**Bold** and *italic* with [link](https://yappout.com)';
const stripped = stripMarkdown(md);
assert(!stripped.includes('#'), 'Should strip header hashes');
assert(!stripped.includes('**'), 'Should strip bold asterisks');
assert(stripped.includes('Bold'), 'Should keep bold word');

// 2. Tokenization & reading sequence
const tokens = tokenizeText('Hello Yappout', 'title', 0);
assert.strictEqual(tokens.length, 2);
assert.strictEqual(tokens[0].index, 0);
assert.strictEqual(tokens[1].index, 1);

// 3. Segment delimiter parsing
const promptExample = 'Cogmit helps organize ideas, preserve knowledge, and build connections. It keeps everything structured!';
const segments = segmentText(promptExample, 'body', 0);
assert.strictEqual(segments.length, 4);
assert.strictEqual(segments[0].text, 'Cogmit helps organize ideas,');
assert.strictEqual(segments[1].text, 'preserve knowledge,');
assert.strictEqual(segments[2].text, 'and build connections.');
assert.strictEqual(segments[3].text, 'It keeps everything structured!');

// 4. Speed cycle
assert.strictEqual(SPEED_CYCLE[DEFAULT_SPEED_IDX], 1);
assert.strictEqual(SPEED_LABELS[0], '1×');
assert.strictEqual(nextSpeedIdx(0), 1); // 1.5x
assert.strictEqual(getSpeed(1), 1.5);
assert.strictEqual(nextSpeedIdx(1), 2); // 2x
assert.strictEqual(getSpeed(2), 2);
assert.strictEqual(nextSpeedIdx(2), 3); // 0.5x
assert.strictEqual(getSpeed(3), 0.5);
assert.strictEqual(nextSpeedIdx(3), 4); // 0.75x
assert.strictEqual(getSpeed(4), 0.75);
assert.strictEqual(nextSpeedIdx(4), 0); // 1x
assert.strictEqual(getSpeed(0), 1);

console.log('All yappout/tests passed successfully!');
