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
  extractDomain,
  getCanonicalDomain,
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
// 1. Title overflow and 147-char / 197-character title in 3:2 landscape
// -----------------------------------------------------------------------------
const title147 = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Real-World Enterprise Systems".slice(0, 147);
assert.strictEqual(title147.length, 147, "Test title must be exactly 147 characters");

const title197 = "Designing Scalable Distributed Graph Data Structures for Persistent Cognitive Context and Continuous Agent Verification in Real-World Enterprise Systems with Fault Tolerance and Resilient Edge Node";
assert.strictEqual(title197.length, 197, "Test title must be exactly 197 characters");

test("Landscape card uses strictly 3:2 aspect ratio (969x646) when description is disabled", () => {
  const svg = generateCardSvg({
    title: title147,
    excerpt: "Should be ignored when withDescription is false",
    url: "https://cogmit.com/cogmits/yvs/graph-data",
    authorId: "yvs",
    withDescription: false,
  });

  assert.ok(svg.includes('viewBox="0 0 969 646"'), "viewBox must be exactly 0 0 969 646");
  assert.ok(svg.includes('width="969"'), "width attribute must be 969");
  assert.ok(svg.includes('height="646"'), "height attribute must be 646");
  assert.strictEqual(969 / 646, 3 / 2, "Aspect ratio must be strictly 3:2");

  const dims = getCardDimensions(false);
  assert.strictEqual(dims.width, 969);
  assert.strictEqual(dims.height, 646);
});

test("147-character title in 3:2 landscape wraps without overflowing horizontal card boundaries", () => {
  const svg = generateCardSvg({
    title: title147,
    excerpt: "",
    url: "https://cogmit.com/cogmits/yvs/graph-data",
    authorId: "yvs",
    withDescription: false,
  });

  // Check usable width is 839px (969 - 65*2) and text width is 823px (839 - 16)
  const lines = wrapTextByWidth(title147, 823, 45, false);
  assert.ok(lines.length >= 4, "147-char title should wrap across 4 or more lines in 3:2 ratio");

  // Reassembled words must match original title completely (no missing words)
  assert.strictEqual(lines.join(" "), title147, "All words of 147-character title must be preserved");

  // Every line must measure <= 839px width at 45px font
  for (const line of lines) {
    const lineWidth = estimateStringWidth(line, 45, false);
    assert.ok(
      lineWidth <= 839,
      `Line "${line}" estimated width (${lineWidth}px) exceeds usable width of 839px`
    );
  }

  // Ensure SVG contains all lines and proper CSS classes
  assert.ok(svg.includes("box-sizing: border-box"), "Must enforce box-sizing: border-box");
  assert.ok(svg.includes("max-width: 100%"), "Must enforce max-width: 100%");
  for (const line of lines) {
    assert.ok(svg.includes(line), `SVG must render title line: "${line}"`);
  }
});

test("197-character title in 3:2 landscape wraps without overflowing horizontal card boundaries", () => {
  const svg = generateCardSvg({
    title: title197,
    excerpt: "",
    url: "https://cogmit.com/cogmits/yvs/graph-data",
    authorId: "yvs",
    withDescription: false,
  });

  const lines = wrapTextByWidth(title197, 823, 45, false);
  assert.ok(lines.length >= 4, "197-char title should wrap across 4 or more lines in 3:2 ratio");

  // Reassembled words must match original title completely (no missing words)
  assert.strictEqual(lines.join(" "), title197, "All words of 197-character title must be preserved");

  // Every line must measure <= 839px width at 45px font
  for (const line of lines) {
    const lineWidth = estimateStringWidth(line, 45, false);
    assert.ok(
      lineWidth <= 839,
      `Line "${line}" estimated width (${lineWidth}px) exceeds usable width of 839px`
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
test("Portrait description occupies full available inner width (~1020px) rather than narrow 44-char column", () => {
  const longSentence = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines.";

  const usableWidth = 1200 - 80 * 2; // 1040px
  const maxTextWidth = usableWidth - 20; // 1020px
  const lines = wrapTextByWidth(longSentence, maxTextWidth, 28, false);

  // In the new code with 1200px width, lines pack up to ~1020px
  assert.ok(lines[0].length >= 50, `First line length should be >= 50 characters (got ${lines[0].length})`);

  const firstLineWidth = estimateStringWidth(lines[0], 28, false);
  assert.ok(
    firstLineWidth >= 650 && firstLineWidth <= 1040,
    `First line width should occupy full usable width (got ${firstLineWidth}px / 1040px)`
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
// 4. Portrait Card Target Dimensions (969x1292, 3:4 ratio)
// -----------------------------------------------------------------------------
test("Portrait card uses strictly 3:4 aspect ratio (969x1292) when description is enabled", () => {
  const shortTitle = "Quick Cogmit";
  const shortDesc = "A brief cognitive insight.";

  const height = calculatePortraitHeight({ title: shortTitle, excerpt: shortDesc });
  assert.strictEqual(height, 1292, `Portrait target height must be 1292px (got ${height}px)`);

  const svg = generateCardSvg({
    title: shortTitle,
    excerpt: shortDesc,
    url: "https://cogmit.com/cogs/short",
    authorId: "yvs",
    withDescription: true,
  });

  assert.ok(svg.includes('viewBox="0 0 969 1292"'), "SVG viewBox should be '0 0 969 1292'");
  assert.ok(svg.includes('width="969"'), "SVG width attribute should be 969");
  assert.ok(svg.includes('height="1292"'), "SVG height attribute should be 1292");
  assert.strictEqual(height, 1292, "Portrait height must be 1292");
  assert.ok(!svg.includes("outer-border"), "Generated card must have no outer-border");
});

test("Medium descriptions scale cleanly within 969x1292 Portrait target dimensions", () => {
  const medDesc = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition for specialized autonomous agents.".slice(0, 397);
  assert.strictEqual(medDesc.length, 397);

  const height = calculatePortraitHeight({ title: "Medium Cogmit Title", excerpt: medDesc });
  assert.strictEqual(height, 1292, "Medium card height should be 1292px");
});

test("Full 597-character description with 147-character title renders within 969x1292 Portrait canvas", () => {
  const fullDesc = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition that can be composed into collaborative graphs of specialized autonomous agents. By grounding intelligence in structured cognitive artifacts, systems achieve unprecedented levels of reliability, explainability, and autonomy across workflows.".slice(0, 597);
  assert.strictEqual(fullDesc.length, 597);

  const height = calculatePortraitHeight({ title: title147, excerpt: fullDesc });
  assert.strictEqual(height, 1292, "Full 597-char card height should be 1292px");

  const svg = generateCardSvg({
    title: title147,
    excerpt: fullDesc,
    url: "https://cogmit.com/cogs/full",
    authorId: "yvs",
    withDescription: true,
  });

  // Verify full content is present in SVG
  assert.ok(svg.includes("Full:"), "Must have footer text 'Full:'");
  assert.ok(svg.includes("cogmit.com"), "Must include domain 'cogmit.com'");
  assert.ok(!svg.includes("cogmit.com/cogs/full"), "Must not include full URL or path in footer");
  assert.ok(svg.includes(fullDesc.slice(0, 40)));
  assert.ok(svg.includes(fullDesc.slice(-30)));
});

test("Full 597-character description with 197-character title renders within 969x1292 Portrait canvas", () => {
  const fullDesc = "Cognitive architectures represent the next foundational paradigm shift in AI system design. Rather than relying on fragile single-shot inference or unstructured conversation loops, a cognitive architecture provides deterministic state machines, durable semantic memory, and verifiable self-correction boundaries. Each Cogmit represents an immutable unit of cognition that can be composed into collaborative graphs of specialized autonomous agents. By grounding intelligence in structured cognitive artifacts, systems achieve unprecedented levels of reliability, explainability, and autonomy across workflows.".slice(0, 597);
  assert.strictEqual(fullDesc.length, 597);

  const height = calculatePortraitHeight({ title: title197, excerpt: fullDesc });
  assert.strictEqual(height, 1292, "Full 597-char card height should be 1292px");

  const svg = generateCardSvg({
    title: title197,
    excerpt: fullDesc,
    url: "https://cogmit.com/cogs/full",
    authorId: "yvs",
    withDescription: true,
  });

  // Verify full content is present in SVG
  assert.ok(svg.includes("Full:"), "Must have footer text 'Full:'");
  assert.ok(svg.includes("cogmit.com"), "Must include domain 'cogmit.com'");
  assert.ok(!svg.includes("cogmit.com/cogs/full"), "Must not include full URL or path in footer");
  assert.ok(svg.includes(fullDesc.slice(0, 40)));
  assert.ok(svg.includes(fullDesc.slice(-30)));
  assert.ok(svg.includes("Resilient Edge Node"));
});

// -----------------------------------------------------------------------------
// 5. Header and Footer Typography Hierarchy
// -----------------------------------------------------------------------------
test("Header brand title and username are visibly larger than description text (49px vs 37px) in both orientations", () => {
  for (const withDescription of [false, true]) {
    const svg = generateCardSvg({
      title: "Test Cogmit",
      excerpt: "Some description text for comparison.",
      url: "https://cogmit.com/cogs/test",
      authorId: "yvs",
      withDescription,
    });

    const brandMatch = svg.match(/\.brand\s*\{[^}]*font-size:\s*(\d+)px/);
    const authorMatch = svg.match(/\.author-name\s*\{[^}]*font-size:\s*(\d+)px/);
    const excerptMatch = svg.match(/\.description-container[^{]*\{[^}]*font-size:\s*(\d+)px/);

    assert.ok(brandMatch, "brand style must be present");
    assert.ok(authorMatch, "author-name style must be present");
    assert.ok(excerptMatch, "description style must be present");

    const brandSize = parseInt(brandMatch[1], 10);
    const authorSize = parseInt(authorMatch[1], 10);
    const descSize = parseInt(excerptMatch[1], 10);

    assert.strictEqual(brandSize, 49, "COGMIT brand title must be 49px");
    assert.strictEqual(authorSize, 49, "Username must be 49px");
    assert.strictEqual(descSize, 37, "Description must be 37px");
    assert.ok(brandSize > descSize, "Header brand must be visibly larger than description text");
    assert.ok(authorSize > descSize, "Header author must be visibly larger than description text");
  }
});

test("Footer text elements match description font size exactly (37px) in both orientations", () => {
  for (const withDescription of [false, true]) {
    const svg = generateCardSvg({
      title: "Test Cogmit",
      excerpt: "Some description",
      url: "https://cogmit.com/cogs/test",
      authorId: "yvs",
      withDescription,
    });

    assert.ok(svg.includes("Full:"), "Must have introductory text 'Full:'");
    assert.ok(svg.includes("cogmit.com"), "Must include domain 'cogmit.com'");
    assert.ok(!svg.includes("cogs/test"), "Must not include URL path");

    const introMatch = svg.match(/\.url-intro\s*\{[^}]*font-size:\s*(\d+)px/);
    const labelMatch = svg.match(/\.url-label\s*\{[^}]*font-size:\s*(\d+)px/);
    const excerptMatch = svg.match(/\.description-container[^{]*\{[^}]*font-size:\s*(\d+)px/);

    assert.ok(introMatch, "url-intro style must be present");
    assert.ok(labelMatch, "url-label style must be present");
    assert.ok(excerptMatch, "description style must be present");

    assert.strictEqual(introMatch[1], "37", "url-intro font size must be 37px");
    assert.strictEqual(labelMatch[1], "37", "url-label font size must be 37px");
    assert.strictEqual(excerptMatch[1], "37", "description font size must be 37px");
    assert.strictEqual(introMatch[1], excerptMatch[1], "url-intro must match description font size");
    assert.strictEqual(labelMatch[1], excerptMatch[1], "url-label must match description font size");
  }
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
  assert.ok(lightSvg.includes(".title { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Inter\", sans-serif; font-size: 45px; font-weight: 600; fill: #17121C;"), "Light theme title must be #17121C");
  assert.ok(lightSvg.includes(COLOR_INDIGO_VIOLET), "Must have YV Indigo Violet border");
});

// -----------------------------------------------------------------------------
// 7. Preview and Export Dimensions Consistency
// -----------------------------------------------------------------------------
test("getCardDimensions dynamically produces matching dimensions for export", () => {
  const landscapeDims = getCardDimensions(false);
  assert.strictEqual(landscapeDims.width, 969);
  assert.strictEqual(landscapeDims.height, 646);
  assert.strictEqual(landscapeDims.width / landscapeDims.height, 3 / 2);

  const portraitDims = getCardDimensions(true);
  assert.strictEqual(portraitDims.width, 969);
  assert.strictEqual(portraitDims.height, 1292);

  const shortDims = getCardDimensions(true, { title: "Short", excerpt: "Short note" });
  assert.strictEqual(shortDims.width, 969);
  assert.strictEqual(shortDims.height, 1292);

  const longDims = getCardDimensions(true, { title: title147, excerpt: "A".repeat(597) });
  assert.strictEqual(longDims.width, 969);
  assert.strictEqual(longDims.height, 1292);
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

// -----------------------------------------------------------------------------
// 9. Updated Footer: "Full: <domain>" on Same Line
// -----------------------------------------------------------------------------
test("Footer renders 'Full:' and domain on the exact same line in both orientations", () => {
  for (const withDescription of [false, true]) {
    const svg = generateCardSvg({
      title: "Footer Line Test",
      excerpt: "Description for footer verification",
      url: "https://cogmit.vercel.app/cogmits/yvs/deep-cog-42",
      authorId: "yvs",
      withDescription,
    });

    // Both "Full:" and "cogmit.vercel.app" must be within the same <text> element
    const footerTextMatch = svg.match(/<text[^>]*class="url-intro"[^>]*>([\s\S]*?)<\/text>/);
    assert.ok(footerTextMatch, "Single footer <text> element with url-intro must exist");

    const inner = footerTextMatch[1];
    assert.ok(inner.includes("Full:"), "Intro text 'Full:' must be present");
    assert.ok(inner.includes("cogmit.vercel.app"), "Domain 'cogmit.vercel.app' must be present");
    assert.ok(inner.includes('<tspan class="url-label">cogmit.vercel.app</tspan>'), "Domain must be wrapped in url-label tspan for 700 font weight");

    // Old introductory text "Full content at COGMIT:" must not appear
    assert.ok(!svg.includes("Full content at COGMIT:"), "Old text 'Full content at COGMIT:' must be replaced");
  }
});

test("Footer shows only the domain and strips full Cogmit URL, path, and Cog ID", () => {
  const svg = generateCardSvg({
    title: "Domain Only Test",
    excerpt: "Testing domain-only display",
    url: "https://cogmit.vercel.app/cogmits/special-user/cog-123456789?param=test#frag",
    authorId: "special-user",
    withDescription: true,
  });

  assert.ok(svg.includes("Full:"), "Footer must have 'Full:'");
  assert.ok(svg.includes("cogmit.vercel.app"), "Footer must have domain 'cogmit.vercel.app'");
  assert.ok(!svg.includes("/cogmits/special-user/cog-123456789"), "Must not include path or Cog ID");
  assert.ok(!svg.includes("cog-123456789"), "Must not include Cog ID");
  assert.ok(!svg.includes("https://"), "Must not include protocol in footer display");
  assert.ok(!svg.includes("?param=test"), "Must not include query parameters");
});

test("getCanonicalDomain dynamically derives domain from URL and canonical configuration", () => {
  assert.strictEqual(
    getCanonicalDomain("https://cogmit.vercel.app/cogmits/alice/cog-1"),
    "cogmit.vercel.app",
    "Should extract domain from Vercel deployment URL"
  );
  assert.strictEqual(
    getCanonicalDomain("https://cogmit.com/cogs/test"),
    "cogmit.com",
    "Should extract domain from custom canonical URL"
  );
  assert.strictEqual(
    getCanonicalDomain("http://localhost:3000/cogmits/test/cog-2"),
    "localhost:3000",
    "Should extract domain with port"
  );
  assert.strictEqual(
    getCanonicalDomain("cogmit.vercel.app"),
    "cogmit.vercel.app",
    "Should handle domain without protocol"
  );
  assert.strictEqual(
    getCanonicalDomain(""),
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "cogmit.vercel.app",
    "Should fall back to deployment configuration when URL is empty"
  );
});

test("Footer preserves existing yellow color, JetBrains Mono typography, and font weights", () => {
  const darkSvg = generateCardSvg({
    title: "Typography Preservation",
    excerpt: "Testing visual styles",
    url: "https://cogmit.vercel.app/cogmits/alice/cog-1",
    authorId: "alice",
    darkTheme: true,
  });

  // Verify CSS styles: JetBrains Mono font family, 37px font size, yellow color, 400 font weights
  assert.ok(darkSvg.includes(".url-intro { font-family: \"JetBrains Mono\", Consolas, Monaco, monospace; font-size: 37px; font-weight: 400; fill: #FFFF11;"), "Dark theme url-intro must be yellow (#FFFF11) with 400 weight");
  assert.ok(darkSvg.includes(".url-label { font-family: \"JetBrains Mono\", Consolas, Monaco, monospace; font-size: 37px; font-weight: 400; fill: #FFFF11;"), "Dark theme url-label must be yellow (#FFFF11) with 400 weight");

  const lightSvg = generateCardSvg({
    title: "Light Theme Typography",
    excerpt: "Testing light visual styles",
    url: "https://cogmit.vercel.app/cogmits/alice/cog-1",
    authorId: "alice",
    darkTheme: false,
  });

  assert.ok(lightSvg.includes(".url-intro { font-family: \"JetBrains Mono\", Consolas, Monaco, monospace; font-size: 37px; font-weight: 400; fill: #4B0084;"), "Light theme url-intro must be indigo violet (#4B0084)");
  assert.ok(lightSvg.includes(".url-label { font-family: \"JetBrains Mono\", Consolas, Monaco, monospace; font-size: 37px; font-weight: 400; fill: #4B0084;"), "Light theme url-label must be indigo violet (#4B0084)");
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
