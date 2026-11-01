import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Cogmit Share Modal Final UI Refinement Test Suite");
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
let clipboardText = "";
let clipboardItems = [];
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: {
    writeText: async (text) => {
      clipboardText = text;
      return Promise.resolve();
    },
    write: async (items) => {
      clipboardItems = items;
      return Promise.resolve();
    },
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

// ---------------------------------------------------------------------------------
// Acceptance Criterion 1: All redundant labels removed from visible UI
// ---------------------------------------------------------------------------------
await test("1. All redundant labels removed (Landscape, Portrait, Dark theme, Rich Link Preview, Social crawler, Canonical URL, char counters)", async () => {
  await act(async () => {
    root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
  });

  const redundantLabels = [
    "Landscape",
    "Portrait",
    "Dark theme",
    "Rich Link Preview",
    "Social crawler compatible",
    "Public RootCog sharing options",
    "Canonical Cogmit URL",
    "Open Graph and Twitter summary metadata",
    "Open Graph & Twitter summary metadata",
    "147 chars",
    "597 chars",
  ];

  for (const label of redundantLabels) {
    assert.strictEqual(
      container.innerHTML.includes(label),
      false,
      `Label '${label}' must be completely removed from the visible modal`
    );
  }
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 2: Canonical URL appears immediately below modal header
// ---------------------------------------------------------------------------------
await test("2. Canonical URL appears immediately below header without redundant label", async () => {
  const modalBody = container.querySelector(".overflow-y-auto");
  assert.ok(modalBody, "Modal body container must exist");

  const firstChild = modalBody.children[0];
  assert.ok(
    firstChild.textContent?.includes("https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558"),
    "First child of modal body must contain canonical public URL"
  );
  assert.strictEqual(
    firstChild.textContent?.includes("Canonical Cogmit URL"),
    false,
    "Canonical Cogmit URL label must be removed"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 3: Sharing actions contain Copy Link, Share, and Copy Card (renamed from Copy Image)
// ---------------------------------------------------------------------------------
await test("3. Sharing actions contain Copy Link, Share, and Copy Card (renamed from Copy Image)", async () => {
  const modalBody = container.querySelector(".overflow-y-auto");
  const actionsRow = modalBody.children[1];
  assert.ok(actionsRow, "Actions row must be the second child in modal body");

  const buttons = Array.from(actionsRow.querySelectorAll("button"));
  assert.strictEqual(buttons.length, 3, "Must have exactly 3 sharing action buttons in this row (Copy Link, Share, Copy Card)");

  // Button 1: Copy Link
  assert.ok(buttons[0].textContent?.includes("Copy Link"), "Button 1 must be Copy Link");
  assert.strictEqual(buttons[0].disabled, false);

  // Button 2: Share
  assert.ok(buttons[1].textContent?.includes("Share"), "Button 2 must be Share");
  assert.strictEqual(buttons[1].disabled, false);

  // Button 3: Copy Card
  assert.ok(buttons[2].textContent?.includes("Copy Card"), "Button 3 must be Copy Card");
  assert.strictEqual(buttons[2].textContent?.includes("Copy Image"), false, "Must not use old 'Copy Image' label");
  assert.strictEqual(buttons[2].disabled, true, "Copy Card must be disabled before card generation");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 4 & 5: Only ONE primary button initially displaying 'Generate Cogmit Card'
// ---------------------------------------------------------------------------------
await test("4 & 5. Only ONE primary card button exists, initially displaying 'Generate Cogmit Card'", async () => {
  const allButtons = Array.from(container.querySelectorAll("button"));
  const primaryButtons = allButtons.filter(
    (b) => b.textContent?.includes("Generate Cogmit Card") || b.textContent?.includes("Download Cogmit Card")
  );
  assert.strictEqual(primaryButtons.length, 1, "There must be only ONE primary Generate/Download button");
  assert.ok(primaryButtons[0].textContent?.includes("Generate Cogmit Card"), "Primary button must initially display 'Generate Cogmit Card'");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 6, 7, 8: Selection buttons (purple outline when unselected, purple bg when selected) to left
// ---------------------------------------------------------------------------------
await test("6, 7, 8. Description and Dark theme are selection buttons with purple outline/bg on left of primary action", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description button must exist");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "With description must default to unselected");
  // Unselected appearance: purple outline, transparent background
  assert.ok(toggleDesc.classList.contains("border-[#4B0084]"), "Must have purple outline border-[#4B0084]");
  assert.ok(toggleDesc.classList.contains("bg-transparent"), "Must have transparent background when unselected");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark Cogmit Card button must exist");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark Cogmit Card must default to selected");
  // Selected appearance: purple background
  assert.ok(toggleDark.classList.contains("bg-[#4B0084]"), "Must have purple background bg-[#4B0084] when selected");

  // Verify layout: both configuration buttons are to the left of the primary action
  const configContainer = toggleDesc.parentElement;
  assert.ok(configContainer, "Configuration container must exist");
  const primaryBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(
    configContainer.compareDocumentPosition(primaryBtn) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
    "Primary button must follow the configuration buttons (be on the right)"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 9: Default Rich Link preview without description/body excerpt
// ---------------------------------------------------------------------------------
await test("9. Default state shows Rich Link preview with exact 'Cogmit | <user>: <title>' format and no excerpt", async () => {
  assert.ok(container.innerHTML.includes("Cogmit | yvnow: Quantum Memory Architectures"), "Must render exact sharing text format");
  assert.strictEqual(container.innerHTML.includes("Exploring distributed synaptic weights"), false, "No description or body excerpt in preview");

  // Card preview image not rendered
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.strictEqual(previewImg, null, "Card preview image must not exist before clicking Generate");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 10 & 11: Clicking Generate transitions to Download Cogmit Card and replaces config with Change Options
// ---------------------------------------------------------------------------------
await test("10 & 11. Clicking Generate replaces config buttons with 'Change Options' and primary button with 'Download Cogmit Card'", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must exist");

  await act(async () => {
    generateBtn.click();
  });

  // 1. Both config buttons are replaced by Change Options
  assert.strictEqual(container.querySelector("#toggle-with-description"), null, "With description button must be replaced");
  assert.strictEqual(container.querySelector("#toggle-dark-theme"), null, "Dark Cogmit Card button must be replaced");

  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.toLowerCase().includes("change options")
  );
  assert.ok(changeOptionsBtn, "Change Options button must be displayed on the left");

  // 2. Primary button is now Download Cogmit Card
  const allButtons = Array.from(container.querySelectorAll("button"));
  const primaryButtons = allButtons.filter(
    (b) => b.textContent?.includes("Generate Cogmit Card") || b.textContent?.includes("Download Cogmit Card")
  );
  assert.strictEqual(primaryButtons.length, 1, "There must still be only ONE primary card button");
  assert.ok(primaryButtons[0].textContent?.includes("Download Cogmit Card"), "Primary button must now display 'Download Cogmit Card'");

  // 3. Card preview is rendered in the preview area
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Generated Cogmit Card preview image must be rendered");

  // 4. Copy Card is now enabled
  const copyCardBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Card")
  );
  assert.strictEqual(copyCardBtn.disabled, false, "Copy Card must be enabled after generation");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 12: Copy Card writes image to clipboard with 'Copied Card!' feedback
// ---------------------------------------------------------------------------------
await test("12. Copy Card copies card blob to clipboard and displays 'Copied Card!' feedback", async () => {
  const { setCachedCard, getCachedCard, computeCardSourceHash, TEMPLATE_VERSION } = await import("../src/lib/card-renderer.ts");
  const cacheKey = "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558|desc:false|dark:true";
  const sourceHash = computeCardSourceHash(
    "Quantum Memory Architectures and Synaptic Cognitive Models",
    "Exploring distributed synaptic weights in neural computational nodes.",
    "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
    "yvnow",
    TEMPLATE_VERSION,
    false,
    true
  );
  const entry = getCachedCard(cacheKey, sourceHash);
  if (entry) {
    entry.blob = new Blob(["fake-image-bytes"], { type: "image/png" });
    setCachedCard(cacheKey, entry);
  }

  const copyCardBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Card")
  );
  assert.ok(copyCardBtn, "Copy Card button must exist");

  await act(async () => {
    copyCardBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  assert.ok(container.innerHTML.includes("Copied Card!"), "Copied Card! feedback must be displayed");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 13: Download Cogmit Card downloads existing card without re-generating
// ---------------------------------------------------------------------------------
await test("13. Download Cogmit Card downloads existing card without re-generating", async () => {
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Download Cogmit Card button must exist");

  await act(async () => {
    downloadBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  // Verify button still says Download Cogmit Card (did not flip back to Generate)
  assert.ok(downloadBtn.textContent?.includes("Download Cogmit Card"));
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 14: Change Options restores configuration interface
// ---------------------------------------------------------------------------------
await test("14. Change Options restores configuration interface and Rich Link preview", async () => {
  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.toLowerCase().includes("change options")
  );
  assert.ok(changeOptionsBtn, "Change Options button must exist");

  await act(async () => {
    changeOptionsBtn.click();
  });

  // Selection buttons are restored
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description button must be restored");
  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark Cogmit Card button must be restored");

  // Primary button restores 'Generate Cogmit Card'
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must be restored");

  // Rich Link preview returns
  assert.ok(container.innerHTML.includes("Cogmit | yvnow: Quantum Memory Architectures"), "Rich Link preview must return");
  assert.strictEqual(container.querySelector("img[alt^='Cogmit Card']"), null, "Card preview image must not exist");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 15: Toggle selection buttons updates visual state and subsequent generation
// ---------------------------------------------------------------------------------
await test("15. Toggle selection buttons updates visual state (purple bg when enabled) and card generation", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  await act(async () => {
    toggleDesc.click();
  });
  // Now enabled -> purple background
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "true");
  assert.ok(toggleDesc.classList.contains("bg-[#4B0084]"), "Must have purple bg when enabled");

  // Click Generate Cogmit Card
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  await act(async () => {
    generateBtn.click();
  });

  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  const previewContainer = previewImg.closest("div.overflow-hidden");
  assert.ok(!previewContainer.classList.contains("aspect-[4/3]"), "Portrait card must not enforce 4:3 aspect ratio");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 16: Top-right X button closes modal and reopening restores default state
// ---------------------------------------------------------------------------------
await test("16. Top-right X button closes modal and reopening restores default state", async () => {
  const closeXBtn = container.querySelector("button[aria-label='Close']");
  assert.ok(closeXBtn, "Top-right X button must exist");

  await act(async () => {
    closeXBtn.click();
    await new Promise((r) => setTimeout(r, 60));
  });
  assert.strictEqual(container.innerHTML, "", "Modal must be closed");

  // Reopen
  await act(async () => {
    setOpenState(true);
    await new Promise((r) => setTimeout(r, 60));
  });

  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "With description resets to false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark theme resets to true");

  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must be restored");
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
await act(async () => {
  root.unmount();
});
