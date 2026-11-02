import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Cogmit Card Font Rendering & Regression Test Suite");
console.log("==================================================================");

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// Setup JSDOM environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
  url: "https://cogmit.app",
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { ShareCogmitModal } = await import("../src/components/ShareCogmitModal.tsx");
const {
  generateCardSvg,
  wrapTextByWidth,
  estimateStringWidth,
  CARD_FONTS,
  CARD_WIDTH_PORTRAIT,
  CARD_HEIGHT_PORTRAIT,
  CARD_WIDTH_LANDSCAPE,
  CARD_HEIGHT_LANDSCAPE,
} = await import("../src/lib/card-renderer.ts");

const sampleTitle = "Quantum Memory Architectures and Synaptic Cognitive Models in Neural Distributed Systems";
const sampleExcerpt = "Exploring distributed synaptic weights in neural computational nodes and cognitive architectures for deep reasoning, deterministic state transitions, and high-performance neural compute.";
const sampleUrl = "https://cogmit.app/cog/12345";
const sampleAuthor = "testuser";

// 1. XML Validity for all fonts
test("1. XML Validity: Generated SVG parses cleanly with 0 parsererror for Arial, Verdana, and Times New Roman", () => {
  const parser = new dom.window.DOMParser();

  for (const fontOption of CARD_FONTS) {
    const portraitSvg = generateCardSvg({
      title: sampleTitle,
      excerpt: sampleExcerpt,
      url: sampleUrl,
      authorId: sampleAuthor,
      withDescription: true,
      darkTheme: true,
      font: fontOption.id,
    });

    const docPortrait = parser.parseFromString(portraitSvg, "image/svg+xml");
    const errorsPortrait = docPortrait.getElementsByTagName("parsererror");
    assert.strictEqual(
      errorsPortrait.length,
      0,
      `Portrait SVG for font ${fontOption.id} has parser errors: ${errorsPortrait[0]?.textContent}`
    );

    const landscapeSvg = generateCardSvg({
      title: sampleTitle,
      excerpt: "",
      url: sampleUrl,
      authorId: sampleAuthor,
      withDescription: false,
      darkTheme: true,
      font: fontOption.id,
    });

    const docLandscape = parser.parseFromString(landscapeSvg, "image/svg+xml");
    const errorsLandscape = docLandscape.getElementsByTagName("parsererror");
    assert.strictEqual(
      errorsLandscape.length,
      0,
      `Landscape SVG for font ${fontOption.id} has parser errors: ${errorsLandscape[0]?.textContent}`
    );
  }
});

// 2. Verdana baseline preservation
test("2. Verdana Baseline Preservation: Wrap counts and content match exact baseline", () => {
  const usableWidth = CARD_WIDTH_PORTRAIT - 65 * 2; // 839
  const maxVerdanaWidth = usableWidth - 48; // 791

  const defaultTitleLines = wrapTextByWidth(sampleTitle, maxVerdanaWidth, 41, true);
  const explicitVerdanaLines = wrapTextByWidth(sampleTitle, maxVerdanaWidth, 41, true, "Verdana");

  assert.deepStrictEqual(
    defaultTitleLines,
    explicitVerdanaLines,
    "Default wrapping without font param must exactly match explicit Verdana wrapping"
  );

  const defaultExcerptLines = wrapTextByWidth(sampleExcerpt, maxVerdanaWidth, 37, false);
  const explicitVerdanaExcerptLines = wrapTextByWidth(sampleExcerpt, maxVerdanaWidth, 37, false, "Verdana");

  assert.deepStrictEqual(
    defaultExcerptLines,
    explicitVerdanaExcerptLines,
    "Default excerpt wrapping without font param must exactly match explicit Verdana wrapping"
  );
});

// 3. Arial & Times New Roman Horizontal Content Utilization (No excessive whitespace)
test("3. Arial & Times New Roman Horizontal Content Utilization: Lines use available width efficiently without premature line breaks", () => {
  const vLines = wrapTextByWidth(sampleTitle, 791, 41, true, "Verdana");
  const aLines = wrapTextByWidth(sampleTitle, 823, 41, true, "Arial");
  const tLines = wrapTextByWidth(sampleTitle, 823, 41, true, "Times New Roman");

  // In Verdana, the title takes 3 lines because Verdana is wide
  assert.strictEqual(vLines.length, 3, "Verdana title wraps into 3 lines");

  // In Arial, the first line packs more words ("Quantum Memory Architectures and Synaptic" vs "Quantum Memory Architectures and")
  assert.ok(
    aLines[0].includes("Synaptic"),
    "Arial line 1 packs 'Synaptic' rather than breaking prematurely like Verdana"
  );

  // In Times New Roman, the title fits compactly into 2 lines
  assert.ok(
    tLines.length <= 2,
    `Times New Roman title should fit in 2 lines due to narrower font metrics (got ${tLines.length})`
  );

  // Line 1 of Arial uses over 90% of available width (823)
  const aLine1Width = estimateStringWidth(aLines[0], 41, true, "Arial");
  const aUtilization = aLine1Width / 823;
  assert.ok(
    aUtilization >= 0.85,
    `Arial line 1 utilization must be >= 85% to prevent excessive whitespace (got ${(aUtilization * 100).toFixed(1)}%)`
  );

  // Line 1 of Times New Roman uses over 80% of available width (823)
  const tLine1Width = estimateStringWidth(tLines[0], 41, true, "Times New Roman");
  const tUtilization = tLine1Width / 823;
  assert.ok(
    tUtilization >= 0.80,
    `Times New Roman line 1 utilization must be >= 80% to prevent excessive whitespace (got ${(tUtilization * 100).toFixed(1)}%)`
  );
});

// 4. Scoped SVG Styles: No global SVG, paragraph, or font leakage
test("4. Scoped SVG Styles: SVG style blocks do NOT inject unscoped 'svg' or 'p' rules", () => {
  for (const fontOption of CARD_FONTS) {
    const svg = generateCardSvg({
      title: sampleTitle,
      excerpt: sampleExcerpt,
      url: sampleUrl,
      authorId: sampleAuthor,
      withDescription: true,
      darkTheme: true,
      font: fontOption.id,
    });

    // Check that styles are scoped
    assert.ok(
      !svg.match(/[\s{;]svg\s*\{/i),
      `SVG for ${fontOption.id} must not contain generic unscoped 'svg {' CSS selector`
    );
    assert.ok(
      !svg.match(/,\s*p\s*\{/i),
      `SVG for ${fontOption.id} must not contain generic unscoped 'p {' CSS selector`
    );
    assert.ok(
      svg.includes(".cogmit-card-svg"),
      `SVG for ${fontOption.id} must scope its root styles to '.cogmit-card-svg'`
    );
    assert.ok(
      svg.includes('class="cogmit-card-svg"'),
      `SVG for ${fontOption.id} root <svg> element must have class='cogmit-card-svg'`
    );
  }
});

// 5. Download Button and Icon Regression Prevention in UI Modal
await testAsync("5. UI Modal Regression Prevention: Download button and icons retain structure in Arial, Verdana, and Times New Roman", async () => {
  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  for (const fontOption of CARD_FONTS) {
    await act(async () => {
      root.render(
        React.createElement(ShareCogmitModal, {
          open: true,
          onOpenChange: () => {},
          title: sampleTitle,
          description: sampleExcerpt,
          shareUrl: sampleUrl,
          authorId: sampleAuthor,
        })
      );
    });

    // Click Generate Cogmit Card
    const buttons = Array.from(container.querySelectorAll("button"));
    const generateBtn = buttons.find((b) => b.textContent?.includes("Generate Cogmit Card"));
    assert.ok(generateBtn, "Generate button must exist");

    await act(async () => {
      generateBtn.click();
    });

    // Expand options
    const pencilBtn = container.querySelector("#btn-change-options");
    assert.ok(pencilBtn, "Pencil button must exist");
    await act(async () => {
      pencilBtn.click();
    });

    // Select the font
    const fontSelect = container.querySelector("#card-font-select");
    assert.ok(fontSelect, "Font select dropdown must exist");
    await act(async () => {
      fontSelect.value = fontOption.id;
      fontSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });

    // Verify Download Cogmit Card button exists and has whitespace-nowrap
    const downloadButtons = Array.from(container.querySelectorAll("button"));
    const downloadBtn = downloadButtons.find((b) => b.textContent?.includes("Download Cogmit Card"));
    assert.ok(downloadBtn, `Download Cogmit Card button must exist for font ${fontOption.id}`);
    assert.ok(
      downloadBtn.className.includes("whitespace-nowrap"),
      `Download button must include whitespace-nowrap to prevent vertical text wrapping for font ${fontOption.id}`
    );

    // Verify Download icon retains exact dimensions (h-4 w-4)
    const downloadIcon = downloadBtn.querySelector("svg.lucide-download");
    assert.ok(downloadIcon, `Download Lucide icon must exist for font ${fontOption.id}`);
    assert.ok(
      downloadIcon.classList.contains("h-4") && downloadIcon.classList.contains("w-4"),
      `Download icon must have classes 'h-4 w-4' for font ${fontOption.id}`
    );
    assert.ok(
      downloadIcon.classList.contains("min-w-4") && downloadIcon.classList.contains("min-h-4"),
      `Download icon must have explicit min dimensions 'min-w-4 min-h-4' for font ${fontOption.id}`
    );

    // Verify Pencil icon retains exact dimensions
    const pencilIcon = pencilBtn.querySelector("svg.lucide-pencil");
    assert.ok(pencilIcon, `Pencil icon must exist for font ${fontOption.id}`);
    assert.ok(
      pencilIcon.classList.contains("h-4") && pencilIcon.classList.contains("w-4"),
      `Pencil icon must have classes 'h-4 w-4' for font ${fontOption.id}`
    );

    // Clean up
    await act(async () => {
      root.render(null);
    });
  }
});

// 6. Intrinsic Dimensions
test("6. Intrinsic Dimensions: Portrait is 969x1292 and Landscape is 969x646 across all fonts", () => {
  for (const fontOption of CARD_FONTS) {
    const portraitSvg = generateCardSvg({
      title: sampleTitle,
      excerpt: sampleExcerpt,
      url: sampleUrl,
      authorId: sampleAuthor,
      withDescription: true,
      font: fontOption.id,
    });
    assert.ok(
      portraitSvg.includes(`width="${CARD_WIDTH_PORTRAIT}" height="${CARD_HEIGHT_PORTRAIT}"`),
      `Portrait SVG for ${fontOption.id} must have intrinsic dimensions ${CARD_WIDTH_PORTRAIT}x${CARD_HEIGHT_PORTRAIT}`
    );

    const landscapeSvg = generateCardSvg({
      title: sampleTitle,
      excerpt: "",
      url: sampleUrl,
      authorId: sampleAuthor,
      withDescription: false,
      font: fontOption.id,
    });
    assert.ok(
      landscapeSvg.includes(`width="${CARD_WIDTH_LANDSCAPE}" height="${CARD_HEIGHT_LANDSCAPE}"`),
      `Landscape SVG for ${fontOption.id} must have intrinsic dimensions ${CARD_WIDTH_LANDSCAPE}x${CARD_HEIGHT_LANDSCAPE}`
    );
  }
});

console.log("------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
