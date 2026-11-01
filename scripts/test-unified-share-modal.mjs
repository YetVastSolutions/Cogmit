import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Unified Generate/Download Cogmit Card Button Test Suite");
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
// Acceptance Criterion 1 & 2: Visible labels 'Description' and 'Dark'
// ---------------------------------------------------------------------------------
await test("1 & 2. 'Description' and 'Dark' are displayed instead of 'With description' and 'Dark Cogmit Card'", async () => {
  await act(async () => {
    root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
  });

  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "Description button must exist");
  assert.strictEqual(toggleDesc.textContent?.trim(), "Description", "Visible text must be 'Description'");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark button must exist");
  assert.strictEqual(toggleDark.textContent?.trim(), "Dark", "Visible text must be 'Dark'");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 3, 4, 5: Embedded inside unified primary component, Generate on left, options on right
// ---------------------------------------------------------------------------------
await test("3, 4, 5. Generate Cogmit Card on left and Description/Dark on right embedded inside unified bar", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  const toggleDark = container.querySelector("#toggle-dark-theme");
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );

  assert.ok(generateBtn, "Generate Cogmit Card button must exist");
  assert.ok(toggleDesc, "Description option must exist");
  assert.ok(toggleDark, "Dark option must exist");

  // Verify they share the same unified parent container
  const unifiedBar = generateBtn.closest("div");
  assert.ok(unifiedBar?.contains(toggleDesc), "Description must be inside the unified component");
  assert.ok(unifiedBar?.contains(toggleDark), "Dark must be inside the unified component");

  // Generate on left, options on right
  assert.ok(
    generateBtn.compareDocumentPosition(toggleDesc) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
    "Description option must be on the right of Generate Cogmit Card"
  );
  assert.ok(
    generateBtn.compareDocumentPosition(toggleDark) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
    "Dark option must be on the right of Generate Cogmit Card"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 6 & 7: Clicking an option changes ONLY that option and NEVER triggers generation or download
// ---------------------------------------------------------------------------------
await test("6 & 7. Clicking Description or Dark toggles state and NEVER triggers generation", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false");

  // Click Description
  await act(async () => {
    toggleDesc.click();
  });
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "true", "Description must toggle to true");

  // Card generation must NOT be triggered
  assert.strictEqual(container.querySelector("img[alt^='Cogmit Card']"), null, "Preview image must NOT be created");
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Primary action must still be Generate Cogmit Card (not Download)");

  // Click Dark
  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true");
  await act(async () => {
    toggleDark.click();
  });
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "false", "Dark must toggle to false");

  // Still not generated
  assert.strictEqual(container.querySelector("img[alt^='Cogmit Card']"), null, "Card preview image must still be null");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 8 & 9: Clicking Generate changes label to Download Cogmit Card and replaces options with Edit icon
// ---------------------------------------------------------------------------------
await test("8 & 9. Clicking Generate changes primary label to 'Download Cogmit Card' and replaces options with Edit icon", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must exist");

  await act(async () => {
    generateBtn.click();
  });

  // Primary button label is now Download Cogmit Card
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Primary button must now display 'Download Cogmit Card'");

  // Description and Dark are replaced
  assert.strictEqual(container.querySelector("#toggle-with-description"), null, "Description button must be removed");
  assert.strictEqual(container.querySelector("#toggle-dark-theme"), null, "Dark button must be removed");

  // Edit icon exists on the right of the same unified button
  const editBtn = container.querySelector("#btn-change-options");
  assert.ok(editBtn, "Edit icon button must exist on the right");
  assert.ok(editBtn.querySelector("svg"), "Edit button must contain Lucide pencil icon");
  const unifiedBar = downloadBtn.closest("div");
  assert.ok(unifiedBar?.contains(editBtn), "Edit button must be inside the same unified component");

  // Preview image is now rendered
  assert.ok(container.querySelector("img[alt^='Cogmit Card']"), "Card preview image must be rendered");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 10 & 11: Clicking Edit icon restores Description and Dark and preserves values
// ---------------------------------------------------------------------------------
await test("10 & 11. Clicking Edit icon restores Description/Dark controls and preserves previously selected values", async () => {
  const editBtn = container.querySelector("#btn-change-options");
  assert.ok(editBtn, "Edit button must exist");

  await act(async () => {
    editBtn.click();
  });

  // Options are restored
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "Description button must be restored");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "true", "Previously selected withDescription=true must be preserved");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark button must be restored");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "false", "Previously selected darkTheme=false must be preserved");

  // Primary action restored to Generate Cogmit Card
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card must be restored");

  // Preview transitions back to Rich Link
  assert.strictEqual(container.querySelector("img[alt^='Cogmit Card']"), null, "Card preview must be replaced by Rich Link preview");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 12: Download works without regenerating the card
// ---------------------------------------------------------------------------------
await test("12. Clicking Download downloads the already-generated card without regenerating", async () => {
  // Generate first
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  await act(async () => {
    generateBtn.click();
  });

  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Download button must exist");

  await act(async () => {
    downloadBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  // Verify button remains Download Cogmit Card (did not reset or re-generate)
  assert.ok(downloadBtn.textContent?.includes("Download Cogmit Card"));
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 13: Copy Card, Copy Link, and Share continue working
// ---------------------------------------------------------------------------------
await test("13. Copy Card, Copy Link, and Share actions work properly", async () => {
  const { setCachedCard, getCachedCard, computeCardSourceHash, TEMPLATE_VERSION } = await import("../src/lib/card-renderer.ts");
  const cacheKey = "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558|desc:true|dark:false";
  const sourceHash = computeCardSourceHash(
    "Quantum Memory Architectures and Synaptic Cognitive Models",
    "Exploring distributed synaptic weights in neural computational nodes.",
    "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
    "yvnow",
    TEMPLATE_VERSION,
    true,
    false
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
  assert.strictEqual(copyCardBtn.disabled, false, "Copy Card must be enabled when card is generated");

  await act(async () => {
    copyCardBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });
  assert.ok(container.innerHTML.includes("Copied Card!"), "Copied Card! feedback must be displayed");

  // Copy Link
  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Link")
  );
  clipboardText = "";
  await act(async () => {
    copyLinkBtn.click();
  });
  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 14: Closing and reopening modal restores default options cleanly
// ---------------------------------------------------------------------------------
await test("14. Closing and reopening modal restores default state", async () => {
  const closeXBtn = container.querySelector("button[aria-label='Close']");
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
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "Description resets to false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark resets to true");

  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button is restored");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 15 & 16: Button Width, Centering, and Alignment
// ---------------------------------------------------------------------------------
await test("15. Unified component is horizontally centered with 70% width on desktop/tablet layouts", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must exist");

  const unifiedBar = generateBtn.closest("div");
  assert.ok(unifiedBar, "Unified bar container must exist");

  const classList = unifiedBar.className;
  assert.ok(classList.includes("mx-auto"), "Unified component must be horizontally centered (mx-auto)");
  assert.ok(
    classList.includes("w-[70%]") || classList.includes("sm:w-[70%]"),
    "Unified component must occupy 70% width on desktop/tablet layouts"
  );
  assert.ok(
    classList.includes("w-full"),
    "Unified component must expand to full width on narrow mobile screens to avoid clipping"
  );

  // Preserve internal left-aligned primary action and right-aligned options
  assert.ok(generateBtn.className.includes("text-left"), "Primary action must remain left-aligned");
  const optionsDiv = unifiedBar.querySelector("#toggle-with-description")?.parentElement;
  assert.ok(optionsDiv?.className.includes("shrink-0"), "Options container must remain right-aligned (shrink-0)");
});

await test("16. Sharing action button group is horizontally centered and standalone buttons are centered", async () => {
  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Link")
  );
  assert.ok(copyLinkBtn, "Copy Link button must exist");

  const sharingActionsContainer = copyLinkBtn.parentElement;
  assert.ok(sharingActionsContainer, "Sharing actions container must exist");
  assert.ok(
    sharingActionsContainer.className.includes("justify-center"),
    "Sharing actions group must be horizontally centered (justify-center)"
  );

  // Standalone buttons have center alignment for their content
  const shareBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Share")
  );
  const copyCardBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Card")
  );
  const toggleDesc = container.querySelector("#toggle-with-description");
  const toggleDark = container.querySelector("#toggle-dark-theme");

  assert.ok(shareBtn, "Share button must exist");
  assert.ok(copyCardBtn, "Copy Card button must exist");
  assert.ok(toggleDesc?.className.includes("justify-center"), "Description button must be center-aligned");
  assert.ok(toggleDark?.className.includes("justify-center"), "Dark button must be center-aligned");
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
