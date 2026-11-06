import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Cogmit Card Footer Customization Test Suite");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
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
  url: "http://localhost:3000/cogmits/yvnow/yvnow_2026oct090558",
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;

// Mock Clipboard
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: {
    writeText: async () => Promise.resolve(),
    write: async () => Promise.resolve(),
  },
  configurable: true,
});

global.ClipboardItem = class ClipboardItem {
  constructor(data) {
    this.data = data;
  }
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { ShareCogmitModal } = await import("../src/components/ShareCogmitModal.tsx");
const {
  DEFAULT_FOOTER_CONTENT,
  generateCardSvg,
  computeCardSourceHash,
} = await import("../src/lib/card-renderer.ts");

const container = dom.window.document.getElementById("root");
const root = createRoot(container);

let setOpenState;
function TestModalWrapper(props) {
  const [open, setOpen] = React.useState(props.initialOpen ?? true);
  setOpenState = setOpen;

  return React.createElement(ShareCogmitModal, {
    open,
    onOpenChange: setOpen,
    title: props.title || "Quantum Memory Architectures and Synaptic Cognitive Models",
    authorId: props.authorId || "yvnow",
    shareUrl: props.shareUrl || "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
    content: props.content || "Exploring distributed synaptic weights in neural computational nodes.",
    published: props.published || "2026-10-09T18:25:55.449Z",
  });
}

// Render modal initially
await act(async () => {
  root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
});

// Expand options container
const pencilBtn = container.querySelector("#btn-change-options");
assert.ok(pencilBtn, "Pencil button must exist");
await act(async () => {
  pencilBtn.click();
});

// ---------------------------------------------------------------------------------
// Test 1: Footer Toggle UI Pattern Consistency
// ---------------------------------------------------------------------------------
await test("1. Footer toggle follows the same UI pattern as Description and Dark options", async () => {
  const footerBtn = container.querySelector("#toggle-footer");
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  assert.ok(footerBtn, "Footer toggle button must exist (#toggle-footer)");
  assert.strictEqual(footerBtn.getAttribute("role"), "switch", "Footer toggle must have role='switch'");
  assert.strictEqual(footerBtn.getAttribute("aria-label"), "Footer", "Footer toggle must have aria-label='Footer'");
  assert.ok(footerBtn.textContent?.includes("Footer"), "Footer button text must include 'Footer'");

  // Verify they share the same parent row container
  assert.strictEqual(footerBtn.parentElement, descBtn.parentElement, "Footer must share row container with Description");
  assert.strictEqual(footerBtn.parentElement, darkBtn.parentElement, "Footer must share row container with Dark");

  // Default state: Disabled
  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "false", "Footer default state must be disabled (false)");

  const dot = footerBtn.querySelector("span[aria-hidden='true']");
  assert.ok(dot, "Footer toggle must have an indicator dot");
  assert.ok(dot.classList.contains("rounded-full"), "Dot must be circular (rounded-full)");
  assert.ok(dot.classList.contains("bg-white"), "Disabled dot must be white");

  // Inactive outline styling
  assert.ok(footerBtn.className.includes("border-transparent"), "Disabled Footer must have border-transparent");
  assert.ok(!footerBtn.className.includes("border-[#FFFF11]"), "Disabled Footer must NOT have active yellow border");

  // Editable textarea is NOT displayed when disabled
  const textarea = container.querySelector("#card-footer-input");
  assert.strictEqual(textarea, null, "Footer content textarea must not be visible when Footer is disabled");
});

// ---------------------------------------------------------------------------------
// Test 2: Card rendering when Footer is disabled
// ---------------------------------------------------------------------------------
await test("2. When disabled, no footer section appears inside the Cogmit card", () => {
  const landscapeSvg = generateCardSvg({
    title: "Testing Card No Footer",
    excerpt: "No footer excerpt",
    url: "https://cogmit.com/cogs/1",
    withFooter: false,
  });

  assert.ok(!landscapeSvg.includes("Published with Cogmit"), "Must not include default footer content");
  assert.ok(!landscapeSvg.includes("class=\"url-intro footer-text\""), "Must not include footer-text in landscape");

  const portraitSvg = generateCardSvg({
    title: "Testing Card No Footer",
    excerpt: "No footer excerpt",
    url: "https://cogmit.com/cogs/1",
    withDescription: true,
    withFooter: false,
  });

  assert.ok(!portraitSvg.includes("Published with Cogmit"), "Must not include default footer content in portrait");
  assert.ok(!portraitSvg.includes("class=\"url-intro footer-text\""), "Must not include footer-text in portrait");
});

// ---------------------------------------------------------------------------------
// Test 3: Enabling Footer populates predefined default content in editable textarea
// ---------------------------------------------------------------------------------
await test("3. Enabling Footer displays editable textarea automatically populated with default content", async () => {
  const footerBtn = container.querySelector("#toggle-footer");

  await act(async () => {
    footerBtn.click();
  });

  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "true", "Footer must be enabled (true)");

  const dot = footerBtn.querySelector("span[aria-hidden='true']");
  assert.ok(dot.classList.contains("bg-[#FFFF11]"), "Active Footer dot must be yellow (#FFFF11)");
  assert.ok(footerBtn.className.includes("border-[#FFFF11]"), "Active Footer must have yellow border");
  assert.ok(footerBtn.className.includes("outline-[#FFFF11]"), "Active Footer must have yellow outline");

  // Textarea must now be visible and populated with DEFAULT_FOOTER_CONTENT
  const textarea = container.querySelector("#card-footer-input");
  assert.ok(textarea, "Footer content textarea must be visible when enabled");
  assert.strictEqual(textarea.value, DEFAULT_FOOTER_CONTENT, `Textarea must be populated with '${DEFAULT_FOOTER_CONTENT}'`);
  assert.strictEqual(DEFAULT_FOOTER_CONTENT, "Published with Cogmit", "DEFAULT_FOOTER_CONTENT must be 'Published with Cogmit'");
});

// ---------------------------------------------------------------------------------
// Test 4: Default footer content renders inside the Cogmit card
// ---------------------------------------------------------------------------------
await test("4. Default footer content renders inside Cogmit card when enabled", () => {
  const svg = generateCardSvg({
    title: "Card With Default Footer",
    excerpt: "Excerpt",
    url: "https://cogmit.com/cogs/1",
    withFooter: true,
  });

  assert.ok(svg.includes("Published with Cogmit"), "Card must render 'Published with Cogmit'");
  assert.ok(svg.includes("class=\"url-intro footer-text\""), "Card must include footer-text class");
  assert.ok(svg.includes("<!-- Footer divider -->"), "Card must render footer divider");
});

// Helper to set textarea value in React/JSDOM
function setTextareaValue(element, value) {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

// ---------------------------------------------------------------------------------
// Test 5: Custom footer content editing and rendering
// ---------------------------------------------------------------------------------
await test("5. Users can freely edit/replace footer content and it renders inside card", async () => {
  const textarea = container.querySelector("#card-footer-input");
  assert.ok(textarea, "Footer textarea must exist");

  const customText = "Created with Precision • Cogmit 2026";
  await act(async () => {
    setTextareaValue(textarea, customText);
  });

  assert.strictEqual(textarea.value, customText, "Textarea value must be updated");

  const svg = generateCardSvg({
    title: "Card With Custom Footer",
    excerpt: "Excerpt",
    url: "https://cogmit.com/cogs/1",
    withFooter: true,
    footerContent: customText,
  });

  assert.ok(svg.includes(customText), `Card must render custom content: '${customText}'`);
});

// ---------------------------------------------------------------------------------
// Test 6: Disabling hides without deleting content, and re-enabling restores it
// ---------------------------------------------------------------------------------
await test("6. Disabling hides footer without deleting content; re-enabling restores previously entered content", async () => {
  const footerBtn = container.querySelector("#toggle-footer");

  // Disable Footer
  await act(async () => {
    footerBtn.click();
  });

  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "false", "Footer must be disabled");
  assert.strictEqual(container.querySelector("#card-footer-input"), null, "Textarea must be hidden");

  // Re-enable Footer
  await act(async () => {
    footerBtn.click();
  });

  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "true", "Footer must be re-enabled");
  const restoredTextarea = container.querySelector("#card-footer-input");
  assert.ok(restoredTextarea, "Textarea must be visible again");
  assert.strictEqual(
    restoredTextarea.value,
    "Created with Precision • Cogmit 2026",
    "Previously entered content must be restored"
  );
});

// ---------------------------------------------------------------------------------
// Test 7: Empty content behaviour - does not render empty footer section
// ---------------------------------------------------------------------------------
await test("7. If enabled but content is empty, do not render an empty footer section", async () => {
  const textarea = container.querySelector("#card-footer-input");
  await act(async () => {
    setTextareaValue(textarea, "");
  });

  // Test SVG generator directly with empty footerContent
  const svgEmpty = generateCardSvg({
    title: "Card With Empty Footer",
    excerpt: "Excerpt",
    url: "https://cogmit.com/cogs/1",
    withFooter: true,
    footerContent: "",
  });

  assert.ok(!svgEmpty.includes("class=\"url-intro footer-text\""), "Empty footer content must not render footer text element");
  assert.ok(!svgEmpty.includes("<!-- Footer divider -->"), "Empty footer content must not render footer divider");

  // Test SVG generator directly with whitespace-only footerContent
  const svgWhitespace = generateCardSvg({
    title: "Card With Whitespace Footer",
    excerpt: "Excerpt",
    url: "https://cogmit.com/cogs/1",
    withFooter: true,
    footerContent: "    ",
  });

  assert.ok(!svgWhitespace.includes("class=\"url-intro footer-text\""), "Whitespace footer content must not render footer text element");
  assert.ok(!svgWhitespace.includes("<!-- Footer divider -->"), "Whitespace footer content must not render footer divider");
});

// ---------------------------------------------------------------------------------
// Test 8: Persistence via deterministic cache & source hash
// ---------------------------------------------------------------------------------
await test("8. Cache and source hash accurately reflect footer customization options", () => {
  const hash1 = computeCardSourceHash("T", "E", "https://c.app", "user", "1.8.0", false, true, "Arial", false, "");
  const hash2 = computeCardSourceHash("T", "E", "https://c.app", "user", "1.8.0", false, true, "Arial", true, "Published with Cogmit");
  const hash3 = computeCardSourceHash("T", "E", "https://c.app", "user", "1.8.0", false, true, "Arial", true, "Custom Text");

  assert.notStrictEqual(hash1, hash2, "Source hash with footer enabled must differ from footer disabled");
  assert.notStrictEqual(hash2, hash3, "Source hash with custom footer must differ from default footer");
});

// ---------------------------------------------------------------------------------
// Test 9: Independent operation alongside Description, Dark Theme, and Font
// ---------------------------------------------------------------------------------
await test("9. Footer operates independently alongside Description, Dark Theme, and Font", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");
  const footerBtn = container.querySelector("#toggle-footer");

  // Toggle Description ON
  await act(async () => {
    descBtn.click();
  });
  assert.strictEqual(descBtn.getAttribute("aria-checked"), "true");
  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "true", "Footer must remain true when Description is clicked");

  // Toggle Dark OFF
  await act(async () => {
    darkBtn.click();
  });
  assert.strictEqual(darkBtn.getAttribute("aria-checked"), "false");
  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "true", "Footer must remain true when Dark is clicked");
});

// ---------------------------------------------------------------------------------
// Test 10: Closing and reopening modal resets to default state
// ---------------------------------------------------------------------------------
await test("10. Closing and reopening modal restores default Footer options", async () => {
  // Close modal
  await act(async () => {
    setOpenState(false);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  // Re-open modal
  await act(async () => {
    setOpenState(true);
  });

  // Re-expand options
  const newPencilBtn = container.querySelector("#btn-change-options");
  assert.ok(newPencilBtn, "Pencil button must exist after reopening");
  await act(async () => {
    newPencilBtn.click();
  });

  const footerBtn = container.querySelector("#toggle-footer");
  assert.ok(footerBtn, "Footer button must exist after reopening and expanding");
  assert.strictEqual(footerBtn.getAttribute("aria-checked"), "false", "Footer must reset to disabled when modal is reopened");
  assert.strictEqual(container.querySelector("#card-footer-input"), null, "Textarea must be hidden on reset");
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
