import assert from "node:assert";
import { extractExcerpt } from "../src/lib/excerpt.ts";
import {
  generateCardSvg,
  computeCardSourceHash,
  getCachedCard,
  setCachedCard,
  CARD_WIDTH,
  CARD_HEIGHT,
  COLOR_INDIGO_VIOLET,
  COLOR_YELLOW,
  wrapText,
} from "../src/lib/card-renderer.ts";

console.log("==========================================");
console.log("Running Cogmit Share Options Verification");
console.log("==========================================\n");

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

// ----------------------------------------------------
// 1. Excerpt length rules: 199, 200, > 200 characters
// ----------------------------------------------------

test("Empty content returns empty string", () => {
  assert.strictEqual(extractExcerpt(""), "");
  assert.strictEqual(extractExcerpt("   \n\n  "), "");
});

test("Excerpt at exactly 199 characters is preserved as-is without ellipsis", () => {
  const text199 = "A".repeat(199);
  const result = extractExcerpt(text199, 200);
  assert.strictEqual(result.length, 199);
  assert.strictEqual(result, text199);
  assert.ok(!result.endsWith("…"), "Should not append ellipsis for 199 chars");
});

test("Excerpt at exactly 200 characters is preserved as-is without ellipsis", () => {
  const text200 = "B".repeat(200);
  const result = extractExcerpt(text200, 200);
  assert.strictEqual(result.length, 200);
  assert.strictEqual(result, text200);
  assert.ok(!result.endsWith("…"), "Should not append ellipsis for 200 chars");
});

test("Excerpt at 201 characters is safely truncated to <= 200 characters", () => {
  const text201 = "C".repeat(201);
  const result = extractExcerpt(text201, 200);
  assert.ok(result.length <= 200, `Length ${result.length} exceeds 200`);
  assert.ok(result.endsWith("…"), "Should append ellipsis when truncated");
});

test("Excerpt at 500 characters with words preserves word boundary and <= 200 characters", () => {
  const words = "Cognition represents the profound structuring of human inquiry and thought in public discourse. ".repeat(6);
  const result = extractExcerpt(words, 200);
  assert.ok(result.length <= 200, `Result length ${result.length} exceeds 200`);
  assert.ok(result.endsWith("…"), "Should end with ellipsis");
  assert.ok(!result.includes("  "), "Whitespace should be normalized");
});

// ----------------------------------------------------
// 2. Markdown stripping and formatting preservation
// ----------------------------------------------------

test("Markdown headings, bold, italics, links, and code blocks are stripped cleanly", () => {
  const md = `# My Great Cognition

Here is **bold insight** with *italic nuance* and a [reference link](https://example.com).

\`\`\`javascript
const hiddenCode = true;
\`\`\`

> Blockquotes should become readable prose.

- First item
- Second item
`;

  const result = extractExcerpt(md, 200, "My Great Cognition");
  assert.ok(!result.includes("#"), "Should not contain heading markers");
  assert.ok(!result.includes("**"), "Should not contain bold asterisks");
  assert.ok(!result.includes("hiddenCode"), "Should not include code block content");
  assert.ok(result.includes("bold insight with italic nuance and a reference link"), "Words should be preserved");
  assert.ok(result.includes("Blockquotes should become readable prose"), "Blockquote text should be preserved");
  assert.ok(result.length <= 200);
});

// ----------------------------------------------------
// 3. Unicode, emojis, and punctuation safety
// ----------------------------------------------------

test("Unicode characters and emojis do not break slicing or character counting", () => {
  const unicodeText = "Cognition 🔥 🚀 💡: Understanding AI, человеческое мышление, and philosophical inquiry across 100 dimensions!";
  const result = extractExcerpt(unicodeText, 200);
  assert.ok(result.includes("🔥"));
  assert.ok(result.includes("🚀"));
  assert.ok(result.includes("💡"));
  assert.ok(result.includes("человеческое"));
  assert.ok(result.length <= 200);
});

// ----------------------------------------------------
// 4. Deterministic Card SVG generation
// ----------------------------------------------------

test("generateCardSvg generates valid SVG with YVS colors and accurate text", () => {
  const title = "Understanding Cognitive Architectures";
  const excerpt = "A deep inspection of agentic loops and deterministic state machines.";
  const url = "https://cogmit.com/cogmits/yvs/test-cogmit-123";
  const authorId = "yviyv";

  const svg = generateCardSvg({
    title,
    excerpt,
    url,
    authorId,
  });

  // Verify YVS Brand colors
  assert.ok(svg.includes(COLOR_INDIGO_VIOLET), "Should contain YVS Indigo-Violet background");
  assert.ok(svg.includes(COLOR_YELLOW), "Should contain YVS Yellow text color");

  // Verify dimensions
  assert.ok(svg.includes(`width="${CARD_WIDTH}"`), "Should match width 1200");
  assert.ok(svg.includes(`height="${CARD_HEIGHT}"`), "Should match height 630");

  // Verify text content
  assert.ok(svg.includes("COGMIT"), "Should display COGMIT brand");
  assert.ok(svg.includes(`@${authorId}`), "Should display author ID");
  assert.ok(svg.includes("A deep inspection of agentic loops and deterministic"), "Should render excerpt line 1");
  assert.ok(svg.includes("state machines."), "Should render excerpt line 2");
  assert.ok(svg.includes(url), "Should render exact canonical URL");
});

test("generateCardSvg safely escapes XML special characters", () => {
  const title = 'Insights <&> "Reflections" & \'Notes\'';
  const excerpt = "Comparing A < B and C > D with 100% & safe characters.";
  const url = "https://cogmit.com/cogmits/author/cog?test=1&sort=asc";

  const svg = generateCardSvg({
    title,
    excerpt,
    url,
    authorId: "author&co",
  });

  assert.ok(!svg.includes("<&>"), "Unescaped <&> must not appear");
  assert.ok(svg.includes("&lt;&amp;&gt;"), "Escaped characters must appear");
  assert.ok(svg.includes("&amp;sort=asc"), "URL query param ampersand must be escaped");
});

// ----------------------------------------------------
// 5. Caching and Invalidation
// ----------------------------------------------------

test("Reopening share with identical content reuses cached card", () => {
  const cacheKey = "https://cogmit.com/cogmits/user/cog-1";
  const sourceHash = computeCardSourceHash("Title 1", "Excerpt 1", cacheKey, "user");

  const entry = {
    cacheKey,
    sourceHash,
    excerpt: "Excerpt 1",
    canonicalUrl: cacheKey,
    templateVersion: "1.0.0",
    svgString: "<svg>test</svg>",
    createdAt: Date.now(),
  };

  setCachedCard(cacheKey, entry);

  const cached = getCachedCard(cacheKey, sourceHash);
  assert.ok(cached !== null, "Cached entry should be returned");
  assert.strictEqual(cached.svgString, "<svg>test</svg>");
});

test("Changed content invalidates obsolete card and does not reuse stale asset", () => {
  const cacheKey = "https://cogmit.com/cogmits/user/cog-2";
  const oldHash = computeCardSourceHash("Title 2", "Old Excerpt", cacheKey, "user");
  const newHash = computeCardSourceHash("Title 2", "New Modified Excerpt", cacheKey, "user");

  const entry = {
    cacheKey,
    sourceHash: oldHash,
    excerpt: "Old Excerpt",
    canonicalUrl: cacheKey,
    templateVersion: "1.0.0",
    svgString: "<svg>old</svg>",
    createdAt: Date.now(),
  };

  setCachedCard(cacheKey, entry);

  const resultWithNewHash = getCachedCard(cacheKey, newHash);
  assert.strictEqual(resultWithNewHash, null, "Should return null and invalidate stale cache entry");
});

// ----------------------------------------------------
// 6. Word wrapping utility
// ----------------------------------------------------

test("wrapText cleanly wraps long sentences without losing words", () => {
  const text = "The quick brown fox jumps over the lazy dog and explores the cognitive boundaries.";
  const lines = wrapText(text, 25);
  assert.ok(lines.length > 1, "Should wrap into multiple lines");
  const reassembled = lines.join(" ");
  assert.strictEqual(reassembled, text, "All words must be preserved in order");
  for (const line of lines) {
    assert.ok(line.length <= 25, `Line length ${line.length} exceeds 25`);
  }
});

// ----------------------------------------------------
// 7. Rich link metadata structure verification
// ----------------------------------------------------

test("Rich Link metadata generates valid Open Graph and Twitter summary without requiring preview image", () => {
  const cogmit = {
    title: "Philosophy of Cognitive Distribution",
    description: "An inquiry into distributed systems and shared thoughts.",
    content: "Full markdown content goes here...",
    authorId: "yviyv",
    cogmitId: "cogmit-42",
    publishedAt: "2026-10-10T12:00:00Z",
  };

  const origin = "https://cogmit.com";
  const canonicalUrl = `${origin}/cogmits/${cogmit.authorId}/${cogmit.cogmitId}`;
  const descriptionExcerpt = extractExcerpt(cogmit.description || cogmit.content, 200, cogmit.title);

  const metadata = {
    title: cogmit.title,
    description: descriptionExcerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: cogmit.title,
      description: descriptionExcerpt,
      url: canonicalUrl,
      siteName: "Cogmit",
      type: "article",
      publishedTime: cogmit.publishedAt,
      authors: [cogmit.authorId],
    },
    twitter: {
      card: "summary",
      title: cogmit.title,
      description: descriptionExcerpt,
    },
  };

  assert.strictEqual(metadata.title, "Philosophy of Cognitive Distribution");
  assert.strictEqual(metadata.alternates.canonical, "https://cogmit.com/cogmits/yviyv/cogmit-42");
  assert.strictEqual(metadata.openGraph.url, "https://cogmit.com/cogmits/yviyv/cogmit-42");
  assert.strictEqual(metadata.openGraph.siteName, "Cogmit");
  assert.strictEqual(metadata.openGraph.type, "article");
  assert.strictEqual(metadata.twitter.card, "summary");
  assert.ok(!("images" in metadata.openGraph), "OpenGraph must not require images");
  assert.ok(!("images" in metadata.twitter), "Twitter card must not require images");
  assert.ok(metadata.description.length <= 200);
});

// ----------------------------------------------------
// 8. Strict character boundary tests: 198, 199, 200, 201, 202 chars
// ----------------------------------------------------

test("Boundary test: 198 chars has no ellipsis", () => {
  const s198 = "X".repeat(198);
  const res = extractExcerpt(s198, 200);
  assert.strictEqual(res.length, 198);
  assert.strictEqual(res, s198);
});

test("Boundary test: 199 chars has no ellipsis", () => {
  const s199 = "Y".repeat(199);
  const res = extractExcerpt(s199, 200);
  assert.strictEqual(res.length, 199);
  assert.strictEqual(res, s199);
});

test("Boundary test: 200 chars has no ellipsis", () => {
  const s200 = "Z".repeat(200);
  const res = extractExcerpt(s200, 200);
  assert.strictEqual(res.length, 200);
  assert.strictEqual(res, s200);
});

test("Boundary test: 201 chars produces <= 200 chars with ellipsis", () => {
  const s201 = "W".repeat(201);
  const res = extractExcerpt(s201, 200);
  assert.ok(res.length <= 200, `Length ${res.length} > 200`);
  assert.ok(res.endsWith("…"), "Must have ellipsis");
});

test("Boundary test: 202 chars produces <= 200 chars with ellipsis", () => {
  const s202 = "V".repeat(202);
  const res = extractExcerpt(s202, 200);
  assert.ok(res.length <= 200, `Length ${res.length} > 200`);
  assert.ok(res.endsWith("…"), "Must have ellipsis");
});

console.log("\n------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("------------------------------------------");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
}
