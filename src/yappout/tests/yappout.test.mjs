// src/yappout/tests/yappout.test.mjs
// Unit tests for Yappout

import assert from 'node:assert';
import { stripMarkdown } from '../utils/markdownExtractor.ts';
import { tokenizeText } from '../utils/textNormalizer.ts';
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

// 3. Speed cycle
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
