import assert from "node:assert";
import {
  CARD_WIDTH_LANDSCAPE,
  CARD_HEIGHT_LANDSCAPE,
  CARD_WIDTH_PORTRAIT,
  CARD_HEIGHT_PORTRAIT,
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  COLOR_INDIGO_VIOLET,
  COLOR_YELLOW,
  TEMPLATE_VERSION,
  generateCardSvg,
  getCardDimensions,
  calculatePortraitHeight,
  wrapTextByWidth,
  wrapText,
  estimateStringWidth,
  computeCardSourceHash,
  getCachedCard,
  setCachedCard,
} from "../src/lib/card-renderer.ts";
import { extractExcerpt, MAX_EXCERPT_LENGTH } from "../src/lib/excerpt.ts";

console.log("==================================================================");
console.log("Running Cogmit Card Layout, Dynamic Sizing & Typography Test Suite");
console.log("==================================================================\n");

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

// -----------------------------------------------------------------------------
// 1. Title overflow and 147-character title in 4:3 landscape
// -----------------------------------------------------------------------------
const title147 = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Real-World Enterprise Systems".slice(0, 147);
assert.strictEqual(title147.length, 147, "Test title must be exactly 147 characters");

test("Landscape card uses strictly 4:3 aspect ratio (1200x900) when description is disabled", () => {
  const svg = generateCardSvg({
    title: title147,
    excerpt: "Should be ignored when withDescription is false",
    url: "https://cogmit.com/cogmits/yvs/graph-data",
    authorId: "yvs",
    withDescription: false,
  });

  assert.ok(svg.includes('viewBox="0 0 1200 900"'), "viewBox must be exactly 0 0 1200 900");
  assert.ok(svg.includes('width="1200"'), "width attribute must be 1200");
  assert.ok(svg.includes('height="900"'), "height attribute must be 900");
  assert.strictEqual(1200 / 900, 4 / 3, "Aspect ratio must be strictly 4:3");

  const dims = getCardDimensions(false);
  assert.strictEqual(dims.width, 1200);
  assert.strictEqual(dims.height, 900);
});

test("147-character title in 4:3 landscape wraps without overflowing horizontal card boundaries", () => {
  const svg = generateCardSvg({
    title: title147,
    excerpt: "",
    url: "https://cogmit.com/cogmits/yvs/graph-data",
    authorId: "yvs",
    withDescription: false,
  });

  // Check usable width is 1040px (1200 - 80*2) and border is at 32/1168 (1136px)
  const lines = wrapTextByWidth(title147, 1020, 56, true);
  assert.ok(lines.length >= 4, "147-char title should wrap across 4 or more lines");

  // Reassembled words must match original title completely (no missing words)
  assert.strictEqual(lines.join(" "), title147, "All words of 147-character title must be preserved");

  // Every line must measure <= 1040px width at 56px bold font
  for (const line of lines) {
    const lineWidth = estimateStringWidth(line, 56, true);
    assert.ok(
      lineWidth <= 1040,
      `Line "${line}" estimated width (${lineWidth}px) exceeds usable width of 1040px`
    );
  }

  // Ensure SVG contains all lines and proper CSS classes
  assert.ok(svg.includes("box-sizing: border-box"), "Must enforce box-sizing: border-box");
  assert.ok(svg.includes("max-width: 100%"), "Must enforce max-width: 100%");
  for (const line of lines) {
    assert.ok(svg.includes(line), `SVG must render title line: "${line}"`);
  }
});

// -----------------------------------------------------------------------------
// 2. Portrait Description Width & Eliminating Narrow Column
// -----------------------------------------------------------------------------
test("Portrait description occupies full available inner width (~760px) rather than narrow 44-char column", () => {
  const longSentence = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines.";
  
  const usableWidth = 900 - 64 * 2; // 772px
  const maxTextWidth = usableWidth - 12; // 760px
  const lines = wrapTextByWidth(longSentence, maxTextWidth, 28, false);

  // In the old code with wrapText(..., 44), lines had <= 44 chars and width was ~580px
  // In the new code, lines should pack up to ~760px (around 52-58 chars)
  assert.ok(lines[0].length >= 50, `First line length should be >= 50 characters (got ${lines[0].length})`);
  
  const firstLineWidth = estimateStringWidth(lines[0], 28, false);
  assert.ok(
    firstLineWidth >= 650 && firstLineWidth <= 772,
    `First line width should occupy full usable width (got ${firstLineWidth}px / 772px)`
  );
});

// -----------------------------------------------------------------------------
// 3. Description Maximum is 597 Characters
// -----------------------------------------------------------------------------
test("CARD_DESCRIPTION_MAX and MAX_EXCERPT_LENGTH are strictly 597", () => {
  assert.strictEqual(CARD_DESCRIPTION_MAX, 597);
  assert.strictEqual(MAX_EXCERPT_LENGTH, 597);
});

test("extractExcerpt supports up to 597 characters without premature truncation", () => {
  const text650 = "A".repeat(650);
  const excerpt = extractExcerpt(text650, CARD_DESCRIPTION_MAX);
  assert.strictEqual(excerpt.length, 597, "Excerpt should be capped at exactly 597 chars");

  const naturalText597 = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition that can be composed into collaborative graphs of specialized autonomous agents. By grounding intelligence in structured cognitive artifacts, systems achieve unprecedented levels of reliability, explainability, and autonomy across workflows.".slice(0, 597);
  const result = extractExcerpt(naturalText597, CARD_DESCRIPTION_MAX);
  assert.strictEqual(result.length, 597);
});

test("extractDescription helper uses 597 characters", () => {
  const text700 = "B".repeat(700);
  const res = extractExcerpt(text700, CARD_DESCRIPTION_MAX);
  assert.strictEqual(res.length, 597);
});

// -----------------------------------------------------------------------------
// 4. Portrait Card Height is Content-Driven
// -----------------------------------------------------------------------------
test("Short descriptions produce compact portrait card height, reducing empty space", () => {
  const shortTitle = "Quick Cogmit";
  const shortDesc = "A brief cognitive insight.";
  
  const height = calculatePortraitHeight({ title: shortTitle, excerpt: shortDesc });
  assert.ok(height < 600, `Short card height (${height}px) should be compact (< 600px)`);

  const svg = generateCardSvg({
    title: shortTitle,
    excerpt: shortDesc,
    url: "https://cogmit.com/cogs/short",
    authorId: "yvs",
    withDescription: true,
  });

  assert.ok(svg.includes(`viewBox="0 0 900 ${height}"`), "SVG viewBox should match content-driven height");
  assert.ok(svg.includes(`height="${height}"`), "SVG height attribute should match content-driven height");
  assert.ok(svg.includes(`height="${height - 28 * 2}"`), "Outer border rect height should match inset content height");
});

test("Medium descriptions (397 chars) scale portrait card height appropriately", () => {
  const medDesc = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition for specialized autonomous agents.".slice(0, 397);
  assert.strictEqual(medDesc.length, 397);

  const height = calculatePortraitHeight({ title: "Medium Cogmit Title", excerpt: medDesc });
  assert.ok(height >= 750 && height <= 950, `Medium card height (${height}px) should be ~750-950px`);
});

test("Full 597-character description with 147-character title expands height without clipping or overflow", () => {
  const fullDesc = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition that can be composed into collaborative graphs of specialized autonomous agents. By grounding intelligence in structured cognitive artifacts, systems achieve unprecedented levels of reliability, explainability, and autonomy across workflows.".slice(0, 597);
  assert.strictEqual(fullDesc.length, 597);

  const height = calculatePortraitHeight({ title: title147, excerpt: fullDesc });
  assert.ok(height >= 1100, `Full 597-char card height (${height}px) should expand sufficiently (>= 1100px)`);

  const svg = generateCardSvg({
    title: title147,
    excerpt: fullDesc,
    url: "https://cogmit.com/cogs/full",
    authorId: "yvs",
    withDescription: true,
  });

  // Verify full content is present in SVG
  assert.ok(svg.includes("Full content at COGMIT:"));
  assert.ok(svg.includes("cogmit.com/cogs/full"));
  assert.ok(svg.includes(fullDesc.slice(0, 40)));
  assert.ok(svg.includes(fullDesc.slice(-30)));
});

// -----------------------------------------------------------------------------
// 5. Footer Typography Matching Author Username
// -----------------------------------------------------------------------------
test("Footer introductory text matches username font size exactly (22px)", () => {
  const svg = generateCardSvg({
    title: "Test Cogmit",
    excerpt: "Some description",
    url: "https://cogmit.com/cogs/test",
    authorId: "yvs",
    withDescription: true,
  });

  assert.ok(svg.includes("Full content at COGMIT:"), "Must have introductory text 'Full content at COGMIT:'");
  
  // Extract CSS font size for author-name and url-intro
  const authorMatch = svg.match(/\.author-name\s*\{[^}]*font-size:\s*(\d+)px/);
  const introMatch = svg.match(/\.url-intro\s*\{[^}]*font-size:\s*(\d+)px/);

  assert.ok(authorMatch, "author-name style must be present");
  assert.ok(introMatch, "url-intro style must be present");
  assert.strictEqual(
    introMatch[1],
    authorMatch[1],
    `Footer intro font size (${introMatch[1]}px) must match username font size (${authorMatch[1]}px)`
  );
  assert.strictEqual(introMatch[1], "22", "Font size should be 22px");
});

// -----------------------------------------------------------------------------
// 6. Theme Preservation
// -----------------------------------------------------------------------------
test("Dark theme preserves black background, YV Indigo Violet border, and YV Yellow text", () => {
  const darkSvg = generateCardSvg({
    title: "Dark Theme Title",
    excerpt: "Dark theme excerpt",
    url: "https://cogmit.com/cogs/dark",
    authorId: "yvs",
    withDescription: true,
    darkTheme: true,
  });

  assert.ok(darkSvg.includes(".bg { fill: #000000; }"), "Dark theme must have black bg");
  assert.ok(darkSvg.includes(COLOR_INDIGO_VIOLET), "Must have YV Indigo Violet");
  assert.ok(darkSvg.includes(COLOR_YELLOW), "Must have YV Yellow");
});

test("Light theme preserves light surface background, YV Indigo Violet border, and dark text", () => {
  const lightSvg = generateCardSvg({
    title: "Light Theme Title",
    excerpt: "Light theme excerpt",
    url: "https://cogmit.com/cogs/light",
    authorId: "yvs",
    withDescription: true,
    darkTheme: false,
  });

  assert.ok(lightSvg.includes(".bg { fill: #F8F5FA; }"), "Light theme must have #F8F5FA bg");
  assert.ok(lightSvg.includes(".title { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Inter\", sans-serif; font-size: 44px; font-weight: 800; fill: #17121C;"), "Light theme title must be #17121C");
  assert.ok(lightSvg.includes(COLOR_INDIGO_VIOLET), "Must have YV Indigo Violet border");
});

// -----------------------------------------------------------------------------
// 7. Preview and Export Dimensions Consistency
// -----------------------------------------------------------------------------
test("getCardDimensions dynamically produces matching dimensions for export", () => {
  const landscapeDims = getCardDimensions(false);
  assert.strictEqual(landscapeDims.width, 1200);
  assert.strictEqual(landscapeDims.height, 900);

  const shortDims = getCardDimensions(true, { title: "Short", excerpt: "Short note" });
  assert.strictEqual(shortDims.width, 900);
  assert.ok(shortDims.height < 600);

  const longDims = getCardDimensions(true, { title: title147, excerpt: "A".repeat(597) });
  assert.strictEqual(longDims.width, 900);
  assert.ok(longDims.height > 1000);
});

// -----------------------------------------------------------------------------
// 8. Backward Compatibility: wrapText preserves behavior
// -----------------------------------------------------------------------------
test("wrapText function remains fully backward compatible", () => {
  const sample = "The quick brown fox jumps over the lazy dog";
  const lines = wrapText(sample, 15);
  assert.strictEqual(lines.join(" "), sample);
  for (const line of lines) {
    assert.ok(line.length <= 15);
  }
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
