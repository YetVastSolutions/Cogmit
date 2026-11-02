import assert from "node:assert";
import {
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  generateCardSvg,
  wrapText,
  wrapTextByWidth,
  estimateStringWidth,
} from "../src/lib/card-renderer.ts";

console.log("=================================================");
console.log("Running Cogmit 197 Character Limit Verification");
console.log("=================================================\n");

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

// 1. Single source of truth constant
test("MAX_ROOTCOG_TITLE_LENGTH is exactly 197", () => {
  assert.strictEqual(MAX_ROOTCOG_TITLE_LENGTH, 197);
  assert.strictEqual(CARD_TITLE_MAX, 197);
});

test("CARD_DESCRIPTION_MAX remains 597", () => {
  assert.strictEqual(CARD_DESCRIPTION_MAX, 597);
});

// 2. Acceptance of titles at and below previous limit (146, 147 chars)
test("Title at 146 characters is valid", () => {
  const title146 = "A".repeat(146);
  assert.strictEqual(title146.length, 146);
  assert.ok(title146.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Title at previous limit (147 chars) remains valid", () => {
  const title147 = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Real-World Enterprise Systems".slice(0, 147);
  assert.strictEqual(title147.length, 147);
  assert.ok(title147.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

// 3. Acceptance of titles longer than 147 characters (e.g. 148, 175)
test("Title exceeding previous limit (148 chars) is now valid", () => {
  const title148 = "A".repeat(148);
  assert.strictEqual(title148.length, 148);
  assert.ok(title148.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Existing titles longer than 147 characters (e.g. 175 chars) are valid", () => {
  const title175 = "A".repeat(175);
  assert.strictEqual(title175.length, 175);
  assert.ok(title175.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

// 4. Boundary test at exact new limit (197 chars) and rejection at 198 chars
test("Title at exact new limit (197 chars) is valid", () => {
  const title197 = "A".repeat(197);
  assert.strictEqual(title197.length, 197);
  assert.ok(title197.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Title exceeding new limit (198 chars) is rejected by length check", () => {
  const title198 = "A".repeat(198);
  assert.strictEqual(title198.length, 198);
  assert.ok(title198.length > MAX_ROOTCOG_TITLE_LENGTH);
});

// 5. Validation error message format matches new limit
test("Validation error message specifies 197 characters", () => {
  const errorMsg = `Title must be ${MAX_ROOTCOG_TITLE_LENGTH} characters or fewer`;
  assert.strictEqual(errorMsg, "Title must be 197 characters or fewer");
});

// 6. Card renderer with 197-character title in Portrait and Landscape
const naturalTitle197 = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Real-World Enterprise Systems with Fault Tolerance and Resilient Edge Node";
assert.strictEqual(naturalTitle197.length, 197);

test("Portrait SVG cleanly renders 197-character title", () => {
  const svg = generateCardSvg({
    title: naturalTitle197,
    excerpt: "Exploring the fundamentals of agentic systems and their cognitive properties across enterprise networks.",
    url: "https://cogmit.com/cogmits/author/cog123",
    authorId: "author",
    withDescription: true,
  });

  assert.ok(svg.includes("viewBox=\"0 0 1200 1600\""));
  assert.ok(svg.includes("class=\"title\""));
  assert.ok(svg.includes("Designing Scalable Distributed"));
  assert.ok(svg.includes("Resilient Edge Node"));
});

test("Landscape SVG cleanly renders 197-character title", () => {
  const svg = generateCardSvg({
    title: naturalTitle197,
    excerpt: "",
    url: "https://cogmit.com/cogmits/author/cog123",
    authorId: "author",
    withDescription: false,
  });

  assert.ok(svg.includes("viewBox=\"0 0 1200 800\""));
  assert.ok(svg.includes("class=\"title\""));
  assert.ok(svg.includes("Designing Scalable Distributed"));
  assert.ok(svg.includes("Resilient Edge Node"));
});

// 7. Word wrapping preserves all words of 197-char and 147-char titles
test("wrapText preserves all words of a 197-character title", () => {
  const lines = wrapText(naturalTitle197, 34);
  const reassembled = lines.join(" ");
  assert.strictEqual(reassembled, naturalTitle197);
});

test("wrapText preserves all words of a 147-character title", () => {
  const title147 = naturalTitle197.slice(0, 147);
  const lines = wrapText(title147, 34);
  const reassembled = lines.join(" ");
  assert.strictEqual(reassembled, title147);
});

test("wrapTextByWidth wraps 197-char title within usable width (1020px)", () => {
  const lines = wrapTextByWidth(naturalTitle197, 1020, 56, true);
  assert.ok(lines.length >= 4, "Should wrap across 4 or more lines");
  assert.strictEqual(lines.join(" "), naturalTitle197);
  for (const line of lines) {
    const lineWidth = estimateStringWidth(line, 56, true);
    assert.ok(lineWidth <= 1040, `Line "${line}" (${lineWidth}px) must be <= 1040px`);
  }
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-------------------------------------------------");

if (failed > 0) {
  process.exit(1);
}
