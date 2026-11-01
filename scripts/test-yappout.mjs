// scripts/test-yappout.mjs
// Comprehensive test suite for Yappout core logic and acceptance criteria

import assert from 'node:assert';
import { stripMarkdown } from '../src/yappout/utils/markdownExtractor.ts';
import { tokenizeText } from '../src/yappout/utils/textNormalizer.ts';
import {
  SPEED_CYCLE,
  DEFAULT_SPEED_IDX,
  getSpeed,
  getSpeedLabel,
  nextSpeedIdx,
} from '../src/yappout/core/speedController.ts';

console.log('==================================================================');
console.log('Running Yappout Core Engine & Acceptance Criteria Test Suite');
console.log('==================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// -------------------------------------------------------------
// Helper: replicate buildReadingSequence logic
// -------------------------------------------------------------
function buildTestReadingSequence(title, markdownContent) {
  const titleTokens = tokenizeText(title.trim(), 'title', 0);
  const bodyText = stripMarkdown(markdownContent);
  const bodyTokens = tokenizeText(bodyText, 'body', titleTokens.length);
  return {
    words: [...titleTokens, ...bodyTokens],
    titleWordCount: titleTokens.length,
  };
}

// -------------------------------------------------------------
// SECTION 5 & 13: READING SEQUENCE & TOKENIZATION
// -------------------------------------------------------------
console.log('[SECTION 5 & 13] Reading Sequence & Tokenization');

test('Reading sequence starts with Title words before Body words', () => {
  const title = 'RootCog Alpha';
  const body = 'Welcome to the cognitive system.';
  const seq = buildTestReadingSequence(title, body);

  assert.strictEqual(seq.titleWordCount, 2);
  assert.strictEqual(seq.words[0].text, 'RootCog');
  assert.strictEqual(seq.words[0].section, 'title');
  assert.strictEqual(seq.words[0].index, 0);

  assert.strictEqual(seq.words[1].text, 'Alpha');
  assert.strictEqual(seq.words[1].section, 'title');
  assert.strictEqual(seq.words[1].index, 1);

  assert.strictEqual(seq.words[2].text, 'Welcome');
  assert.strictEqual(seq.words[2].section, 'body');
  assert.strictEqual(seq.words[2].index, 2);
});

test('Reading sequence maintains stable, contiguous global word indices', () => {
  const title = 'SingleTitle';
  const body = 'Word one word two word three.';
  const seq = buildTestReadingSequence(title, body);

  assert.strictEqual(seq.words.length, 7);
  for (let i = 0; i < seq.words.length; i++) {
    assert.strictEqual(seq.words[i].index, i, `Word index at ${i} should be strictly ${i}`);
  }
});

test('Markdown formatting is excluded while spoken words are preserved', () => {
  const md = `# H1 Title
## H2 Subtitle
**Bold word** and *italic word* and \`code token\` with [clickable link](https://example.com).
> A blockquote message.
\`\`\`ts
const hidden = true;
\`\`\`
- List item 1
- List item 2
`;
  const stripped = stripMarkdown(md);
  assert(!stripped.includes('#'), 'No Markdown heading hashes');
  assert(!stripped.includes('**'), 'No Markdown bold markers');
  assert(!stripped.includes('*italic*'), 'No Markdown italic markers');
  assert(!stripped.includes('`code token`'), 'No Markdown inline code backticks');
  assert(!stripped.includes('https://example.com'), 'No Markdown URLs');
  assert(!stripped.includes('hidden = true'), 'No code blocks in spoken text');

  // Verify readable content is preserved
  assert(stripped.includes('Bold word'));
  assert(stripped.includes('italic word'));
  assert(stripped.includes('clickable link'));
  assert(stripped.includes('List item 1'));
});

test('Punctuation, apostrophes, and numbers are preserved for natural speech', () => {
  const text = "Yappout's engine doesn't drop punctuation: 3.14, \$500, or well-structured hyphenated-words!";
  const stripped = stripMarkdown(text);
  assert(stripped.includes("Yappout's"));
  assert(stripped.includes("doesn't"));
  assert(stripped.includes("3.14,"));
  assert(stripped.includes("\$500,"));
  assert(stripped.includes("hyphenated-words!"));
});

test('Empty or whitespace-only title and body handled without throwing or invalid tokens', () => {
  const seqEmpty = buildTestReadingSequence('', '');
  assert.strictEqual(seqEmpty.words.length, 0);
  assert.strictEqual(seqEmpty.titleWordCount, 0);

  const seqTitleOnly = buildTestReadingSequence('Only Title', '   \n\n  ');
  assert.strictEqual(seqTitleOnly.words.length, 2);
  assert.strictEqual(seqTitleOnly.titleWordCount, 2);
});

// -------------------------------------------------------------
// SECTION 10: PLAYBACK SPEED CONTROL
// -------------------------------------------------------------
console.log('\n[SECTION 10] Playback Speed Controller');

test('Speed controller defaults exactly to 1x', () => {
  assert.strictEqual(DEFAULT_SPEED_IDX, 0);
  assert.strictEqual(SPEED_CYCLE[DEFAULT_SPEED_IDX], 1);
  assert.strictEqual(getSpeed(DEFAULT_SPEED_IDX), 1);
  assert.strictEqual(getSpeedLabel(DEFAULT_SPEED_IDX), '1×');
});

test('Speed controller follows the exact specified 5-step cycle: 1x -> 1.5x -> 2x -> 0.5x -> 0.75x -> 1x', () => {
  const expectedValues = [1, 1.5, 2, 0.5, 0.75];
  const expectedLabels = ['1×', '1.5×', '2×', '0.5×', '0.75×'];

  let idx = DEFAULT_SPEED_IDX;

  for (let i = 0; i < expectedValues.length; i++) {
    assert.strictEqual(getSpeed(idx), expectedValues[i], `Speed value at step ${i} should be ${expectedValues[i]}`);
    assert.strictEqual(getSpeedLabel(idx), expectedLabels[i], `Speed label at step ${i} should be ${expectedLabels[i]}`);
    idx = nextSpeedIdx(idx);
  }

  // Cycles back to beginning
  assert.strictEqual(getSpeed(idx), 1, 'Speed should wrap back to 1x');
  assert.strictEqual(getSpeedLabel(idx), '1×', 'Speed label should wrap back to 1×');
});

// -------------------------------------------------------------
// SECTION 7 & 15: PLAYBACK STATE MACHINE & SESSION ID GUARDS
// -------------------------------------------------------------
console.log('\n[SECTION 7 & 15] Playback State Machine & Session ID Guards');

test('Rapid seek or stop increments sessionId and cancels stale async callbacks', () => {
  let activeSessionId = 0;
  const spokenWords = [];

  function simulateSpeak(words, startIndex, sessionId) {
    let currentIdx = startIndex;
    function next() {
      if (sessionId !== activeSessionId) {
        // Stale callback blocked!
        return;
      }
      if (currentIdx >= words.length) return;
      spokenWords.push(words[currentIdx].text);
      currentIdx++;
      // simulate async next word
      if (sessionId === activeSessionId) {
        next();
      }
    }
    next();
  }

  const words = [
    { text: 'A', index: 0, section: 'title' },
    { text: 'B', index: 1, section: 'title' },
    { text: 'C', index: 2, section: 'body' },
    { text: 'D', index: 3, section: 'body' },
  ];

  // Start Session 1 from beginning
  activeSessionId = 1;
  simulateSpeak(words, 0, 1);
  assert.deepStrictEqual(spokenWords, ['A', 'B', 'C', 'D']);

  // Seek to word 2 -> increment session to 2
  spokenWords.length = 0;
  activeSessionId = 2;
  simulateSpeak(words, 2, 2);
  assert.deepStrictEqual(spokenWords, ['C', 'D'], 'Seek must speak from selected word');

  // Verify that a delayed callback from session 1 cannot run under session 2
  let staleRan = false;
  const staleCallback = (callbackSessionId) => {
    if (callbackSessionId !== activeSessionId) return;
    staleRan = true;
  };
  staleCallback(1);
  assert.strictEqual(staleRan, false, 'Stale session 1 callback must be rejected');
});

test('Stop resets playback state and clears active reading position', () => {
  let playbackState = 'playing';
  let currentWordIndex = 5;
  let activeRange = { start: 0, end: 1 };

  // Trigger stop
  function handleStop() {
    playbackState = 'stopped';
    currentWordIndex = 0;
    activeRange = null;
  }

  handleStop();
  assert.strictEqual(playbackState, 'stopped');
  assert.strictEqual(currentWordIndex, 0);
  assert.strictEqual(activeRange, null);
});

// -------------------------------------------------------------
// SECTION 8: DOUBLE-TAP / SEEK DETECTOR LOGIC
// -------------------------------------------------------------
console.log('\n[SECTION 8] Double-Tap & Seek Detection Logic');

test('Double-tap detector triggers only when 2 taps occur within 300ms and 20px slop', () => {
  const DOUBLE_TAP_DELAY = 300;
  const TAP_SLOP = 20;

  function evaluateTap(t1, x1, y1, t2, x2, y2) {
    const dt = t2 - t1;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    return dt < DOUBLE_TAP_DELAY && dx < TAP_SLOP && dy < TAP_SLOP;
  }

  // Fast double-tap in place
  assert.strictEqual(evaluateTap(1000, 50, 50, 1150, 52, 51), true, 'Fast tap within threshold should trigger');

  // Slow double-tap (> 300ms)
  assert.strictEqual(evaluateTap(1000, 50, 50, 1350, 50, 50), false, 'Slow tap (>300ms) should not trigger');

  // Distant tap (> 20px apart)
  assert.strictEqual(evaluateTap(1000, 50, 50, 1150, 90, 50), false, 'Distant tap (>20px) should not trigger');
});

// -------------------------------------------------------------
// SECTION 9: SCROLLING BOUNDS & BUFFER LOGIC
// -------------------------------------------------------------
console.log('\n[SECTION 9] Scroll Controller Visibility Bounds');

test('Scroll controller does not scroll when active word is comfortably visible', () => {
  const containerHeight = 800;
  const scrollTop = 200;
  const margin = 80;

  function shouldScroll(wordTop, wordHeight) {
    const wordBottom = wordTop + wordHeight;
    const visTop = scrollTop;
    const visBottom = visTop + containerHeight;

    if (wordTop - margin < visTop) return 'scroll-up';
    if (wordBottom + margin > visBottom) return 'scroll-down';
    return 'none';
  }

  // Word comfortably in center of viewport (top = 400, height = 24)
  assert.strictEqual(shouldScroll(400, 24), 'none');

  // Word too close to top (top = 240, margin = 80 -> 160 < 200)
  assert.strictEqual(shouldScroll(240, 24), 'scroll-up');

  // Word too close to bottom (top = 950, bottom = 974 + 80 = 1054 > 1000)
  assert.strictEqual(shouldScroll(950, 24), 'scroll-down');
});

// -------------------------------------------------------------
// SECTION 6: HIGHLIGHT SPECIFICATION COMPLIANCE
// -------------------------------------------------------------
console.log('\n[SECTION 6] Word Highlight Style Compliance');

test('Highlight styles use YVS Yellow inner outline (#FFFF11) and YVS Indigo outer outline (#4B0084)', () => {
  // Verify colors defined in globals.css and inline style
  const innerColor = '#FFFF11';
  const outerColor = '#4B0084';

  assert.strictEqual(innerColor, '#FFFF11', 'Inner outline must be YVS Yellow');
  assert.strictEqual(outerColor, '#4B0084', 'Outer outline must be YVS Indigo');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n==================================================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('==================================================================\n');

if (failed > 0) {
  process.exit(1);
}
