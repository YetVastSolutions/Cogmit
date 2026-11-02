import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Testing Description & Dark Horizontal Alignment & Active Styling");
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

const container = dom.window.document.getElementById("root");
const root = createRoot(container);

function TestModalWrapper(props) {
  const [open, setOpen] = React.useState(props.initialOpen ?? true);

  return React.createElement(ShareCogmitModal, {
    open,
    onOpenChange: setOpen,
    title: props.title || "Quantum Memory Architectures and Synaptic Cognitive Models",
    authorId: props.authorId || "yvnow",
    shareUrl: props.shareUrl || "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
    description: props.description || "Comprehensive analysis of synaptic networks.",
  });
}

await act(async () => {
  root.render(React.createElement(TestModalWrapper));
});

// Expand options container
const pencilBtn = container.querySelector("#btn-change-options");
assert.ok(pencilBtn, "Pencil toggle button must exist");
await act(async () => {
  pencilBtn.click();
});

const optionsContainer = container.querySelector("#cogmit-card-options-container");
assert.ok(optionsContainer, "Expanded options container must exist");

// ---------------------------------------------------------------------------------
// Acceptance Criterion 1: Description and Dark appear in one horizontal row
// ---------------------------------------------------------------------------------
await test("1. Description and Dark appear in one horizontal row side by side", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  assert.ok(descBtn, "Description button must exist");
  assert.ok(darkBtn, "Dark button must exist");

  // Verify they share a horizontal flex parent row
  const rowContainer = descBtn.parentElement;
  assert.strictEqual(descBtn.parentElement, darkBtn.parentElement, "Both options must share the same parent row container");
  assert.ok(rowContainer.className.includes("flex"), "Options row container must be a flexbox");
  assert.ok(!rowContainer.className.includes("flex-col"), "Options row must NOT be vertically stacked (flex-col)");
  assert.ok(rowContainer.className.includes("items-center"), "Options row must align items center");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 2 & 5: Font selector remains directly below the options row
// ---------------------------------------------------------------------------------
await test("2. Font selector remains directly below the options row", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const rowContainer = descBtn.parentElement;
  const fontSelect = container.querySelector("#card-font-select");
  assert.ok(fontSelect, "Font select element must exist");

  const fontContainer = fontSelect.closest("div");
  assert.strictEqual(rowContainer.nextElementSibling, fontContainer, "Font container must be direct next sibling below options row");
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 3 & 4: Active state styling with yellow outline & inactive state without
// ---------------------------------------------------------------------------------
await test("3. Default state: Dark is active with yellow outline, Description is inactive without yellow outline", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  // Inactive Description: no yellow outline
  assert.ok(
    !descBtn.className.includes("border-[#FFFF11]") && !descBtn.className.includes("outline-[#FFFF11]"),
    "Inactive Description must NOT have yellow outline/border"
  );
  assert.ok(descBtn.className.includes("border-transparent"), "Inactive Description must have border-transparent");

  // Active Dark: has yellow outline/border
  assert.ok(
    darkBtn.className.includes("border-[#FFFF11]") || darkBtn.className.includes("outline-[#FFFF11]"),
    "Active Dark must have yellow outline/border (#FFFF11)"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 2: Description and Dark operate independently
// ---------------------------------------------------------------------------------
await test("4. Activating Description adds yellow outline and does not affect Dark", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  await act(async () => {
    descBtn.click();
  });

  // Both should now be active
  assert.strictEqual(descBtn.getAttribute("aria-checked"), "true");
  assert.strictEqual(darkBtn.getAttribute("aria-checked"), "true");

  assert.ok(
    descBtn.className.includes("border-[#FFFF11]") || descBtn.className.includes("outline-[#FFFF11]"),
    "Now active Description must have yellow outline/border (#FFFF11)"
  );
  assert.ok(
    darkBtn.className.includes("border-[#FFFF11]") || darkBtn.className.includes("outline-[#FFFF11]"),
    "Dark must remain active with yellow outline/border (#FFFF11)"
  );
});

await test("5. Deactivating Dark removes yellow outline and does not affect Description", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  await act(async () => {
    darkBtn.click();
  });

  // Description is active, Dark is inactive
  assert.strictEqual(descBtn.getAttribute("aria-checked"), "true");
  assert.strictEqual(darkBtn.getAttribute("aria-checked"), "false");

  assert.ok(
    descBtn.className.includes("border-[#FFFF11]") || descBtn.className.includes("outline-[#FFFF11]"),
    "Description must remain active with yellow outline/border (#FFFF11)"
  );
  assert.ok(
    !darkBtn.className.includes("border-[#FFFF11]") && !darkBtn.className.includes("outline-[#FFFF11]"),
    "Now inactive Dark must NOT have yellow outline/border"
  );
});

await test("6. Deactivating Description leaves both inactive with no yellow outline", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  await act(async () => {
    descBtn.click();
  });

  // Both are inactive
  assert.strictEqual(descBtn.getAttribute("aria-checked"), "false");
  assert.strictEqual(darkBtn.getAttribute("aria-checked"), "false");

  assert.ok(
    !descBtn.className.includes("border-[#FFFF11]") && !descBtn.className.includes("outline-[#FFFF11]"),
    "Inactive Description must NOT have yellow outline/border"
  );
  assert.ok(
    !darkBtn.className.includes("border-[#FFFF11]") && !darkBtn.className.includes("outline-[#FFFF11]"),
    "Inactive Dark must NOT have yellow outline/border"
  );
});

// ---------------------------------------------------------------------------------
// Acceptance Criterion 6: Preserves existing background and text styling
// ---------------------------------------------------------------------------------
await test("7. Options preserve existing text and background styling", async () => {
  const descBtn = container.querySelector("#toggle-with-description");
  const darkBtn = container.querySelector("#toggle-dark-theme");

  assert.ok(descBtn.className.includes("text-white"), "Description preserves text-white");
  assert.ok(darkBtn.className.includes("text-white"), "Dark preserves text-white");
  assert.strictEqual(descBtn.textContent?.trim(), "Description");
  assert.strictEqual(darkBtn.textContent?.trim(), "Dark");
});

console.log("\n------------------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
