import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Unified Share Cogmit Modal Acceptance Criteria Test Suite");
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
// Acceptance Criterion 1: Modal opens without Cogmit Card / Rich Link tab navigation
// ---------------------------------------------------------------------------------
await test("1. Modal opens without two-tab navigation (no tab switching bar)", async () => {
  await act(async () => {
    root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
  });

  const tabButtons = Array.from(container.querySelectorAll("button")).filter(
    (b) => b.textContent?.trim() === "Cogmit Card" || b.textContent?.trim() === "Rich Link"
  );
  assert.strictEqual(tabButtons.length, 0, "There must be no Cogmit Card / Rich Link tab switcher buttons");

  // Grid tab container should not exist
  const gridTabs = container.querySelector(".grid-cols-2");
  assert.strictEqual(gridTabs, null, "Two-column tab navigation container must be removed");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 2: Canonical URL appears immediately below the modal header
// ---------------------------------------------------------------------------------
await test("2. Canonical Cogmit URL appears immediately below modal header", async () => {
  const modalBody = container.querySelector(".overflow-y-auto");
  assert.ok(modalBody, "Modal body container must exist");

  const firstChild = modalBody.children[0];
  assert.ok(
    firstChild.textContent?.includes("https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558"),
    "First child of modal body must contain canonical public URL"
  );
  assert.ok(
    firstChild.textContent?.includes("Canonical Cogmit URL"),
    "URL component should have canonical label"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 3 & 4: Sharing actions appear immediately below URL with renamed button
// ---------------------------------------------------------------------------------
await test("3 & 4. Sharing actions appear immediately below URL with renamed 'Download Cogmit Card'", async () => {
  const modalBody = container.querySelector(".overflow-y-auto");
  const actionsRow = modalBody.children[1];
  assert.ok(actionsRow, "Actions row must be the second child in modal body");

  const buttons = Array.from(actionsRow.querySelectorAll("button"));
  assert.strictEqual(buttons.length, 4, "Must have exactly 4 sharing action buttons");

  // Verify button 1: Copy Link
  assert.ok(buttons[0].textContent?.includes("Copy Link"), "Button 1 must be Copy Link");
  assert.strictEqual(buttons[0].disabled, false, "Copy Link must be enabled");

  // Verify button 2: Share
  assert.ok(buttons[1].textContent?.includes("Share"), "Button 2 must be Share");
  assert.strictEqual(buttons[1].disabled, false, "Share must be enabled");

  // Verify button 3: Copy Image (disabled when card not generated)
  assert.ok(buttons[2].textContent?.includes("Copy Image"), "Button 3 must be Copy Image");
  assert.strictEqual(buttons[2].disabled, true, "Copy Image must be disabled before card generation");

  // Verify button 4: Download Cogmit Card (renamed, disabled when card not generated)
  assert.ok(buttons[3].textContent?.includes("Download Cogmit Card"), "Button 4 must be renamed to Download Cogmit Card");
  assert.ok(!buttons[3].textContent?.includes("Download PNG"), "Must not use old 'Download PNG' label");
  assert.strictEqual(buttons[3].disabled, true, "Download Cogmit Card must be disabled before card generation");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 5, 6, 7: Generation options & default Rich Link preview (no auto-generate)
// ---------------------------------------------------------------------------------
await test("5, 6, 7. Generation options accessible, Rich Link preview shown by default, no auto-generate", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description toggle must be present");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark Cogmit Card toggle must be present");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true");

  const generateBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must be present");

  // Criterion 6: Rich Link preview is displayed by default
  assert.ok(container.innerHTML.includes("Rich Link Preview"), "Rich Link preview header must be visible");
  assert.ok(container.innerHTML.includes("Quantum Memory Architectures"), "Title must be rendered in Rich Link preview");
  assert.ok(container.innerHTML.includes("Exploring distributed synaptic weights"), "Excerpt must be rendered in Rich Link preview");
  assert.ok(container.innerHTML.includes("Social crawler compatible"), "Social crawler info must be present");

  // Criterion 7: Opening modal does not automatically generate a card
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.strictEqual(previewImg, null, "Card preview image must NOT exist before clicking Generate");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 8 & 9: Clicking Generate replaces Rich Link preview with generated card
// ---------------------------------------------------------------------------------
await test("8 & 9. Clicking Generate replaces Rich Link preview with generated card in same preview area", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must exist");

  await act(async () => {
    generateBtn.click();
  });

  // Rich Link preview must now be replaced
  assert.strictEqual(container.innerHTML.includes("Rich Link Preview"), false, "Rich Link preview must be replaced");

  // Cogmit Card preview must be rendered
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Generated Cogmit Card preview image must be rendered");
  assert.ok(previewImg.getAttribute("src")?.startsWith("data:image/svg+xml"), "Source must be SVG data URL");

  // Image actions are now enabled
  const copyImageBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Copy Image")
  );
  assert.strictEqual(copyImageBtn.disabled, false, "Copy Image must be enabled after generation");

  const downloadBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Download Cogmit Card")
  );
  assert.strictEqual(downloadBtn.disabled, false, "Download Cogmit Card must be enabled after generation");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 10: Copy Link works
// ---------------------------------------------------------------------------------
await test("10. Copy Link writes shareUrl to clipboard and displays feedback", async () => {
  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Copy Link")
  );
  clipboardText = "";

  await act(async () => {
    copyLinkBtn.click();
  });

  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558", "Canonical URL must be copied");
  assert.ok(container.innerHTML.includes("Copied Link!"), "Copied Link! feedback must be displayed");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 11: Share works
// ---------------------------------------------------------------------------------
await test("11. Share button triggers share handler without error", async () => {
  const shareBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Share"
  );
  clipboardText = "";

  await act(async () => {
    shareBtn.click();
  });

  // Falls back to clipboard write if navigator.share not supported in jsdom
  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 12: Copy Image works
// ---------------------------------------------------------------------------------
await test("12. Copy Image writes image to clipboard and displays feedback", async () => {
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

  const copyImageBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Copy Image")
  );
  assert.ok(copyImageBtn, "Copy Image button must exist");

  await act(async () => {
    copyImageBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  assert.ok(container.innerHTML.includes("Copied Image!"), "Copied Image! feedback must be displayed");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 13: Download Cogmit Card works
// ---------------------------------------------------------------------------------
await test("13. Download Cogmit Card executes export without throwing", async () => {
  const downloadBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Download Cogmit Card button must exist");

  await act(async () => {
    downloadBtn.click();
    await new Promise((r) => setTimeout(r, 10));
  });
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 14: Change options works
// ---------------------------------------------------------------------------------
await test("14. Change options reveals options row and switches preview back to Rich Link", async () => {
  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Change options")
  );
  assert.ok(changeOptionsBtn, "Change options button must exist");

  await act(async () => {
    changeOptionsBtn.click();
  });

  // Generation options row is visible again
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description toggle must be visible");

  // Rich Link preview returns
  assert.ok(container.innerHTML.includes("Rich Link Preview"), "Rich Link preview must return when changing options");

  // Image actions are disabled again
  const copyImageBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Copy Image") || b.textContent?.includes("Copied Image!")
  );
  assert.strictEqual(copyImageBtn.disabled, true, "Copy Image must be disabled until generated again");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 15 & 16: Description, dark/light, portrait, landscape configurations
// ---------------------------------------------------------------------------------
await test("15 & 16. Description and dark/light configuration work (Portrait & Landscape)", async () => {
  // Toggle With description (switches to Portrait)
  const toggleDesc = container.querySelector("#toggle-with-description");
  await act(async () => {
    toggleDesc.click();
  });
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "true", "With description must be true");

  // Toggle Dark theme to false (Light theme)
  const toggleDark = container.querySelector("#toggle-dark-theme");
  await act(async () => {
    toggleDark.click();
  });
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "false", "Dark theme must be false");

  // Generate card with Portrait + Light theme
  const generateBtn = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Generate Cogmit Card")
  );
  await act(async () => {
    generateBtn.click();
  });

  assert.ok(container.innerHTML.includes("Portrait"), "Must indicate Portrait mode");
  assert.ok(container.innerHTML.includes("Light theme"), "Must indicate Light theme");

  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  const previewContainer = previewImg.closest("div.overflow-hidden");
  assert.ok(previewContainer.classList.contains("bg-[#F8F5FA]"), "Light theme background must be used");
  assert.ok(!previewContainer.classList.contains("aspect-[4/3]"), "Portrait mode must not enforce 4:3 aspect ratio");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 17: Top-right X continues dismissing the modal
// ---------------------------------------------------------------------------------
await test("17. Top-right X button calls onOpenChange(false) and closes the modal", async () => {
  const closeXBtn = container.querySelector("button[aria-label='Close']");
  assert.ok(closeXBtn, "Top-right X button must exist");

  await act(async () => {
    closeXBtn.click();
    await new Promise((r) => setTimeout(r, 60));
  });

  assert.strictEqual(container.innerHTML, "", "Modal must be unmounted when closed");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 18: Redundant Close and Open Cogmit buttons are removed
// ---------------------------------------------------------------------------------
await test("18. Redundant Close and Open Cogmit buttons are completely removed", async () => {
  // Re-open
  await act(async () => {
    setOpenState(true);
    await new Promise((r) => setTimeout(r, 60));
  });

  const buttonsAndLinks = Array.from(container.querySelectorAll("button, a"));
  const closeTextBtn = buttonsAndLinks.find((el) => el.textContent?.trim() === "Close");
  assert.strictEqual(closeTextBtn, undefined, "Footer/text Close button must not exist");

  const openCogmitLink = buttonsAndLinks.find((el) => el.textContent?.includes("Open Cogmit"));
  assert.strictEqual(openCogmitLink, undefined, "Open Cogmit button must not exist");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 19 & 20: Reset behavior on close and reopen
// ---------------------------------------------------------------------------------
await test("19 & 20. Reopening modal resets to default Rich Link preview state", async () => {
  // Close
  await act(async () => {
    setOpenState(false);
    await new Promise((r) => setTimeout(r, 60));
  });

  // Reopen
  await act(async () => {
    setOpenState(true);
    await new Promise((r) => setTimeout(r, 60));
  });

  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "With description resets to false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark theme resets to true");

  assert.ok(container.innerHTML.includes("Rich Link Preview"), "Default Rich Link preview is displayed on reopen");
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.strictEqual(previewImg, null, "Preview image does not exist on reopen");
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
