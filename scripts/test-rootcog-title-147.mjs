import assert from "node:assert";
import {
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  generateCardSvg,
  wrapText,
} from "../src/lib/card-renderer.ts";

console.log("=================================================");
console.log("Running Cogmit 147 Character Limit Verification");
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
test("MAX_ROOTCOG_TITLE_LENGTH is exactly 147", () => {
  assert.strictEqual(MAX_ROOTCOG_TITLE_LENGTH, 147);
  assert.strictEqual(CARD_TITLE_MAX, 147);
});

test("CARD_DESCRIPTION_MAX is updated to 597", () => {
  assert.strictEqual(CARD_DESCRIPTION_MAX, 597);
});

// 2. Acceptance of titles between 78 and 147 characters
test("Title at previous limit (77 chars) is valid", () => {
  const title77 = "A".repeat(77);
  assert.strictEqual(title77.length, 77);
  assert.ok(title77.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Title between old and new limit (e.g. 110 chars) is valid", () => {
  const title110 = "Cognitive Architectures for Autonomous AI Agents and Multi-Turn Distributed Graph Decision Reasoning Loops";
  assert.strictEqual(title110.length, 106);
  assert.ok(title110.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Title at exact new limit (147 chars) is valid", () => {
  const title147 = "A".repeat(147);
  assert.strictEqual(title147.length, 147);
  assert.ok(title147.length <= MAX_ROOTCOG_TITLE_LENGTH);
});

test("Title exceeding limit (148 chars) is rejected by length check", () => {
  const title148 = "A".repeat(148);
  assert.strictEqual(title148.length, 148);
  assert.ok(title148.length > MAX_ROOTCOG_TITLE_LENGTH);
});

// 3. Card renderer with 147-character title
test("Portrait SVG cleanly renders 147-character title", () => {
  const longTitle = "Deep Cognitive Exploration: Architectures, Reasoning Pipelines, Knowledge Graphs, and Autonomous Multi-Agent Workflows in Large-Scale Production Systems";
  const title147 = longTitle.slice(0, 147);
  assert.strictEqual(title147.length, 147);

  const svg = generateCardSvg({
    title: title147,
    excerpt: "Exploring the fundamentals of agentic systems and their cognitive properties.",
    url: "https://cogmit.com/cogmits/author/cog123",
    authorId: "author",
    withDescription: true,
  });

  assert.ok(svg.includes("viewBox=\"0 0 900 "));
  assert.ok(svg.includes("class=\"title\""));
  // First words of title should be present
  assert.ok(svg.includes("Deep Cognitive Exploration:"));
});

test("Landscape SVG cleanly renders 147-character title", () => {
  const longTitle = "Deep Cognitive Exploration: Architectures, Reasoning Pipelines, Knowledge Graphs, and Autonomous Multi-Agent Workflows in Large-Scale Production Systems";
  const title147 = longTitle.slice(0, 147);
  assert.strictEqual(title147.length, 147);

  const svg = generateCardSvg({
    title: title147,
    excerpt: "",
    url: "https://cogmit.com/cogmits/author/cog123",
    authorId: "author",
    withDescription: false,
  });

  assert.ok(svg.includes("viewBox=\"0 0 1200 800\""));
  assert.ok(svg.includes("class=\"title\""));
  assert.ok(svg.includes("Deep Cognitive Exploration:"));
});

// 4. Word wrapping algorithm does not drop text for 147-char titles
test("wrapText preserves all words of a 147-character title", () => {
  const title = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Production Environments";
  const title147 = title.padEnd(147, "X");
  assert.strictEqual(title147.length, 147);
  const lines = wrapText(title147, 34);
  const reassembled = lines.join(" ");
  assert.strictEqual(reassembled, title147);
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-------------------------------------------------");

if (failed > 0) {
  process.exit(1);
}
