import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Expandable Cogmit Card Generation Options Test Suite");
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
const { CARD_FONTS, DEFAULT_CARD_FONT, generateCardSvg } = await import("../src/lib/card-renderer.ts");

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
// Test 1: Initial state - Options NOT beside button, options container collapsed
// ---------------------------------------------------------------------------------
await test("1. Initial state: Options are not beside button and expanded container is collapsed", async () => {
  await act(async () => {
    root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
  });

  // Description and Dark are NOT rendered beside the button
  const optionsContainer = container.querySelector("#cogmit-card-options-container");
  assert.strictEqual(optionsContainer, null, "Options container must be collapsed initially");

  // Pencil icon exists on right side
  const pencilBtn = container.querySelector("#btn-change-options");
  assert.ok(pencilBtn, "Pencil toggle button must exist on the right of the button");
  assert.ok(pencilBtn.querySelector("svg"), "Pencil button must contain SVG icon");
});

// ---------------------------------------------------------------------------------
// Test 2: Clicking Generate produces card and displays 'Download Cogmit Card' button
// ---------------------------------------------------------------------------------
await test("2. Clicking Generate changes button to 'Download Cogmit Card' and renders card preview", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must exist initially");

  await act(async () => {
    generateBtn.click();
  });

  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Button must now display 'Download Cogmit Card'");

  // Pencil button is still positioned on the right
  const pencilBtn = container.querySelector("#btn-change-options");
  assert.ok(pencilBtn, "Pencil button must remain on the right of Download Cogmit Card button");

  // Options container remains collapsed until pencil is clicked
  assert.strictEqual(container.querySelector("#cogmit-card-options-container"), null);
});

// ---------------------------------------------------------------------------------
// Test 3: Clicking pencil icon expands the options section directly below the button
// ---------------------------------------------------------------------------------
await test("3. Clicking pencil icon expands options section directly below Download Cogmit Card button", async () => {
  const pencilBtn = container.querySelector("#btn-change-options");
  assert.ok(pencilBtn, "Pencil button must exist");

  await act(async () => {
    pencilBtn.click();
  });

  const optionsContainer = container.querySelector("#cogmit-card-options-container");
  assert.ok(optionsContainer, "Expanded options container must exist directly below button");

  // Check positioning: optionsContainer is sibling below the button bar in the same wrapper
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  const buttonBar = downloadBtn.closest("div.w-full");
  assert.strictEqual(optionsContainer.previousElementSibling, buttonBar, "Options container must be immediately below button bar");
});

// ---------------------------------------------------------------------------------
// Test 4: Description and Dark options appear vertically with indicator dots
// ---------------------------------------------------------------------------------
await test("4. Description and Dark options have circular indicator dots with active/disabled states", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  assert.ok(descBtn, "Description button must exist in expanded options");
  assert.strictEqual(descBtn.textContent?.trim(), "Description");

  // Default withDescription is false -> dot must be white
  const descDot = descBtn.querySelector("span[aria-hidden='true']");
  assert.ok(descDot, "Description must have an indicator dot span");
  assert.ok(descDot.classList.contains("rounded-full"), "Dot must be circular (rounded-full)");
  assert.ok(descDot.classList.contains("bg-white"), "Disabled dot must be white");

  // Dark defaults to true -> dot must be yellow (#FFFF11)
  const darkBtn = container.querySelector("#toggle-dark-theme");
  assert.ok(darkBtn, "Dark button must exist in expanded options");
  assert.strictEqual(darkBtn.textContent?.trim(), "Dark");

  const darkDot = darkBtn.querySelector("span[aria-hidden='true']");
  assert.ok(darkDot, "Dark must have an indicator dot span");
  assert.ok(darkDot.classList.contains("rounded-full"), "Dot must be circular (rounded-full)");
  assert.ok(darkDot.classList.contains("bg-[#FFFF11]"), "Active dot must be yellow (#FFFF11)");

  // Toggle Description to active -> dot becomes yellow
  await act(async () => {
    descBtn.click();
  });
  assert.ok(descDot.classList.contains("bg-[#FFFF11]"), "Toggled active Description dot must be yellow (#FFFF11)");

  // Toggle Dark to disabled -> dot becomes white
  await act(async () => {
    darkBtn.click();
  });
  assert.ok(darkDot.classList.contains("bg-white"), "Toggled disabled Dark dot must be white");
});

// ---------------------------------------------------------------------------------
// Test 5: Font dropdown options, default Arial, and structure for extensibility
// ---------------------------------------------------------------------------------
await test("5. Font dropdown has Arial (default), Verdana, and Times New Roman options", async () => {
  const fontSelect = container.querySelector("#card-font-select");
  assert.ok(fontSelect, "Font select dropdown must exist");
  assert.strictEqual(fontSelect.value, "Arial", "Default selected font must be Arial");

  const options = Array.from(fontSelect.querySelectorAll("option")).map((o) => o.value);
  assert.deepStrictEqual(options, ["Arial", "Verdana", "Times New Roman"], "Options must contain Arial, Verdana, Times New Roman");

  assert.strictEqual(DEFAULT_CARD_FONT, "Arial", "DEFAULT_CARD_FONT constant must be 'Arial'");
  assert.ok(Array.isArray(CARD_FONTS), "CARD_FONTS must be an extensible array");
  assert.strictEqual(CARD_FONTS.length, 3, "Initial CARD_FONTS must have 3 fonts");
});

// ---------------------------------------------------------------------------------
// Test 6: Changing font updates the generated Cogmit Card
// ---------------------------------------------------------------------------------
await test("6. Changing font updates the generated Cogmit Card SVG", async () => {
  const fontSelect = container.querySelector("#card-font-select");

  await act(async () => {
    fontSelect.value = "Times New Roman";
    fontSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });

  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Preview image must exist");
  const src = previewImg.getAttribute("src");
  assert.ok(src.includes("Times%20New%20Roman"), "Preview data URI must include Times New Roman font");

  // Verify generateCardSvg helper directly
  const svgArial = generateCardSvg({ title: "T", excerpt: "E", url: "https://c.app", font: "Arial" });
  assert.ok(svgArial.includes("Arial"), "SVG with Arial must use Arial font");

  const svgTimes = generateCardSvg({ title: "T", excerpt: "E", url: "https://c.app", font: "Times New Roman" });
  assert.ok(svgTimes.includes("Times New Roman"), "SVG with Times New Roman must use Times New Roman font");
  assert.notStrictEqual(svgArial, svgTimes, "Arial and Times New Roman SVGs must differ");
});

// ---------------------------------------------------------------------------------
// Test 7: Collapsing and reopening the section does not reset selected options
// ---------------------------------------------------------------------------------
await test("7. Collapsing and reopening options section preserves selected options", async () => {
  const pencilBtn = container.querySelector("#btn-change-options");

  // Collapse section
  await act(async () => {
    pencilBtn.click();
  });
  assert.strictEqual(container.querySelector("#cogmit-card-options-container"), null, "Section must collapse");

  // Re-open section
  await act(async () => {
    pencilBtn.click();
  });
  assert.ok(container.querySelector("#cogmit-card-options-container"), "Section must reopen");

  // Verify options are retained
  const descBtn = container.querySelector("#toggle-with-description");
  assert.strictEqual(descBtn.getAttribute("aria-checked"), "true", "withDescription=true must be preserved");

  const darkBtn = container.querySelector("#toggle-dark-theme");
  assert.strictEqual(darkBtn.getAttribute("aria-checked"), "false", "darkTheme=false must be preserved");

  const fontSelect = container.querySelector("#card-font-select");
  assert.strictEqual(fontSelect.value, "Times New Roman", "Selected font Times New Roman must be preserved");
});

// ---------------------------------------------------------------------------------
// Test 8: Download Cogmit Card button remains functional
// ---------------------------------------------------------------------------------
await test("8. Download Cogmit Card button remains intact and functional", async () => {
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Download Cogmit Card button must be present");
  assert.strictEqual(downloadBtn.disabled, false, "Download button must not be disabled");
});

// ---------------------------------------------------------------------------------
// Test 9: Closing and reopening the modal restores defaults
// ---------------------------------------------------------------------------------
await test("9. Closing and reopening modal restores default options", async () => {
  await act(async () => {
    setOpenState(false);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  await act(async () => {
    setOpenState(true);
  });

  // Modal is back to initial state
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Modal must reset to Generate state upon reopening");
  assert.strictEqual(container.querySelector("#cogmit-card-options-container"), null, "Options container must be collapsed");
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}

