import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Verification for Card Generation UI Adjustments");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

async function check(num, desc, fn) {
  try {
    await fn();
    console.log(`✅ [${num}] PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ [${num}] FAIL: ${desc}`);
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
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: {
    writeText: async (text) => {
      clipboardText = text;
      return Promise.resolve();
    },
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
const { generateCardSvg, getCardDimensions, CARD_WIDTH_PORTRAIT, CARD_HEIGHT_PORTRAIT, CARD_WIDTH_LANDSCAPE, CARD_HEIGHT_LANDSCAPE } = await import("../src/lib/card-renderer.ts");

const container = dom.window.document.getElementById("root");
const root = createRoot(container);

let setOpenModal;
function ModalHost(props) {
  const [open, setOpen] = React.useState(true);
  setOpenModal = setOpen;
  return React.createElement(ShareCogmitModal, {
    open,
    onOpenChange: setOpen,
    title: "Autonomous Agent Orchestration and Cognitive Architecture",
    authorId: "yvnow",
    shareUrl: "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
    content: "Deterministic state machines with verifiable memory and distributed execution boundaries.",
    published: "2026-10-09T18:25:55.449Z",
  });
}

await act(async () => {
  root.render(React.createElement(ModalHost));
});

// 1. Generate a Portrait card and verify there is no outer card border.
await check(1, "Generate Portrait card and verify no outer card border", async () => {
  const portraitSvg = generateCardSvg({
    title: "Portrait Title",
    excerpt: "Portrait Excerpt",
    url: "https://cogmit.com/cogs/test",
    withDescription: true,
    darkTheme: true,
  });

  assert.ok(!portraitSvg.includes("outer-border"), "Portrait SVG must not contain class 'outer-border'");
  assert.ok(!portraitSvg.includes("<rect x=\"26\""), "Portrait SVG must not contain outer border rect");
  assert.ok(portraitSvg.includes("<rect width=\"969\" height=\"1292\" class=\"bg\" />"), "Card background surface must exist");
  assert.ok(portraitSvg.includes("<line x1=\"65\" y1=\"114\""), "Internal dividers must be preserved");
});

// 2. Generate a Landscape card and verify there is no outer card border.
await check(2, "Generate Landscape card and verify no outer card border", async () => {
  const landscapeSvg = generateCardSvg({
    title: "Landscape Title",
    excerpt: "",
    url: "https://cogmit.com/cogs/test",
    withDescription: false,
    darkTheme: true,
  });

  assert.ok(!landscapeSvg.includes("outer-border"), "Landscape SVG must not contain class 'outer-border'");
  assert.ok(!landscapeSvg.includes("<rect x=\"26\""), "Landscape SVG must not contain outer border rect");
  assert.ok(landscapeSvg.includes("<rect width=\"969\" height=\"646\" class=\"bg\" />"), "Card background surface must exist");
  assert.ok(landscapeSvg.includes("<line x1=\"65\" y1=\"114\""), "Internal dividers must be preserved");
});

// 3. Confirm both cards retain their exact intrinsic dimensions.
await check(3, "Confirm both cards retain exact intrinsic dimensions", async () => {
  assert.strictEqual(CARD_WIDTH_PORTRAIT, 969, "Portrait width must be 969");
  assert.strictEqual(CARD_HEIGHT_PORTRAIT, 1292, "Portrait height must be 1292");
  assert.strictEqual(CARD_WIDTH_LANDSCAPE, 969, "Landscape width must be 969");
  assert.strictEqual(CARD_HEIGHT_LANDSCAPE, 646, "Landscape height must be 646");

  const portDims = getCardDimensions(true);
  assert.strictEqual(portDims.width, 969);
  assert.strictEqual(portDims.height, 1292);
  assert.strictEqual(portDims.width / portDims.height, 3 / 4);

  const landDims = getCardDimensions(false);
  assert.strictEqual(landDims.width, 969);
  assert.strictEqual(landDims.height, 646);
  assert.strictEqual(landDims.width / landDims.height, 3 / 2);
});

// 4. Confirm the surrounding Generate Cogmit Card container retains its outline and background.
await check(4, "Surrounding container retains its outline (#4B0084) and background (#1E0038)", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must exist");

  const surroundingContainer = generateBtn.closest("div");
  assert.ok(surroundingContainer, "Surrounding container must exist");

  assert.ok(surroundingContainer.className.includes("border-2"), "Must retain border-2 outline");
  assert.ok(surroundingContainer.className.includes("border-[#4B0084]"), "Must retain border-[#4B0084]");
  assert.ok(surroundingContainer.className.includes("bg-[#1E0038]"), "Must retain bg-[#1E0038]");
  assert.ok(surroundingContainer.className.includes("rounded-lg"), "Must retain rounded-lg");
  assert.ok(surroundingContainer.className.includes("p-1.5"), "Must retain padding p-1.5");
});

// 5. Verify the container occupies 75% of its available parent width.
await check(5, "Verify the container occupies 75% of available parent width", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  const surroundingContainer = generateBtn.closest("div");
  const classList = surroundingContainer.className;

  assert.ok(
    classList.includes("sm:w-[75%]") || classList.includes("w-[75%]"),
    "Container must occupy 75% width"
  );
  assert.ok(classList.includes("w-full"), "Responsive behavior without horizontal overflow on mobile");
  assert.ok(classList.includes("mx-auto"), "Centered within available parent width");
});

// 6. Click the surrounding container and confirm nothing is triggered.
await check(6, "Click surrounding container, background, or empty space and confirm nothing triggered", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  const surroundingContainer = generateBtn.closest("div");

  // Click the surrounding container div directly
  await act(async () => {
    surroundingContainer.click();
    await new Promise((r) => setTimeout(r, 20));
  });

  // Card generation must NOT be triggered
  assert.strictEqual(
    container.querySelector("img[alt^='Cogmit Card']"),
    null,
    "Card preview must not be generated when clicking container"
  );
  assert.ok(
    Array.from(container.querySelectorAll("button")).some((b) =>
      b.textContent?.includes("Generate Cogmit Card")
    ),
    "Button must still read 'Generate Cogmit Card'"
  );
});

// 7. Click the Generate/Download button and confirm its existing action works.
await check(7, "Click Generate/Download button and confirm existing action works", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );

  await act(async () => {
    generateBtn.click();
    await new Promise((r) => setTimeout(r, 20));
  });

  // Card preview is now displayed
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Card preview image must be rendered");

  // Button changes to Download Cogmit Card
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card")
  );
  assert.ok(downloadBtn, "Button must now read 'Download Cogmit Card'");

  // Also verify preview container has no outer border or shadow
  const previewContainer = previewImg.closest("div");
  assert.ok(!previewContainer.className.includes("border-2"), "Preview container must not have border-2");
  assert.ok(!previewContainer.className.includes("shadow-sm"), "Preview container must not have shadow-sm");
  assert.strictEqual(previewContainer.style.borderColor, "", "Preview container must not have inline borderColor");
});

// 8. Activate Description and Dark individually and verify yellow text on Indigo Violet backgrounds.
await check(8, "Activate Description and Dark individually: yellow text (#FFFF11) on Indigo Violet (#4B0084)", async () => {
  // Click edit button to restore toggles
  const editBtn = container.querySelector("#btn-change-options");
  assert.ok(editBtn, "Edit pencil button must exist");
  await act(async () => {
    editBtn.click();
  });

  const toggleDesc = container.querySelector("#toggle-with-description");
  const toggleDark = container.querySelector("#toggle-dark-theme");

  // Activate Description
  await act(async () => {
    toggleDesc.click();
  });
  assert.ok(
    toggleDesc.className.includes("bg-[#4B0084]"),
    "Active Description must have Indigo Violet background (#4B0084)"
  );
  assert.ok(
    toggleDesc.className.includes("text-[#FFFF11]"),
    "Active Description must have Yellow text (#FFFF11)"
  );

  // Activate Dark (toggle off then on)
  await act(async () => {
    toggleDark.click(); // to false
  });
  await act(async () => {
    toggleDark.click(); // back to true
  });
  assert.ok(
    toggleDark.className.includes("bg-[#4B0084]"),
    "Active Dark must have Indigo Violet background (#4B0084)"
  );
  assert.ok(
    toggleDark.className.includes("text-[#FFFF11]"),
    "Active Dark must have Yellow text (#FFFF11)"
  );
});

// 9. Verify inactive button styling remains unchanged.
await check(9, "Verify inactive button styling remains unchanged", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  const toggleDark = container.querySelector("#toggle-dark-theme");

  // Make Description inactive
  await act(async () => {
    toggleDesc.click(); // to false
  });
  assert.ok(
    toggleDesc.className.includes("bg-transparent"),
    "Inactive Description must have transparent background"
  );
  assert.ok(
    toggleDesc.className.includes("border-[#4B0084]"),
    "Inactive Description must have border-[#4B0084]"
  );
  assert.ok(
    toggleDesc.className.includes("text-white/80"),
    "Inactive Description must have text-white/80"
  );

  // Make Dark inactive
  await act(async () => {
    toggleDark.click(); // to false
  });
  assert.ok(
    toggleDark.className.includes("bg-transparent"),
    "Inactive Dark must have transparent background"
  );
  assert.ok(
    toggleDark.className.includes("border-[#4B0084]"),
    "Inactive Dark must have border-[#4B0084]"
  );
  assert.ok(
    toggleDark.className.includes("text-white/80"),
    "Inactive Dark must have text-white/80"
  );
});

// 10. Inspect actual rendered UI, not just CSS declarations.
await check(10, "Inspect actual rendered UI elements and structure", async () => {
  const toggleDesc = container.querySelector("#toggle-with-description");
  const toggleDark = container.querySelector("#toggle-dark-theme");
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );

  assert.ok(generateBtn, "Generate button rendered in DOM");
  assert.ok(toggleDesc, "Description toggle rendered in DOM");
  assert.ok(toggleDark, "Dark toggle rendered in DOM");

  // Verify button is shrink-0 and does not expand across entire container
  assert.ok(generateBtn.className.includes("shrink-0"), "Generate button does not occupy entire row width");
  assert.ok(!generateBtn.className.includes("flex-1"), "Generate button must not have flex-1");
});

// 11. Confirm the footer does not contain the reintroduced phrase 'at COGMIT'.
await check(11, "Confirm footer does NOT contain 'at COGMIT'", async () => {
  for (const withDescription of [false, true]) {
    const svg = generateCardSvg({
      title: "Footer Check",
      excerpt: "Checking footer text",
      url: "https://cogmit.vercel.app/test",
      withDescription,
      darkTheme: true,
    });

    assert.ok(!svg.includes("at COGMIT"), "Must NOT contain 'at COGMIT'");
    assert.ok(svg.includes("Full:"), "Must contain 'Full:'");
    assert.ok(svg.includes("cogmit.vercel.app"), "Must contain domain");
  }
});

// 12. Confirm no unrelated functionality has changed.
await check(12, "Confirm no unrelated functionality has changed", async () => {
  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Link")
  );
  const shareBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Share")
  );
  const copyCardBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Card")
  );

  assert.ok(copyLinkBtn, "Copy Link button is present and functional");
  assert.ok(shareBtn, "Share button is present and functional");
  assert.ok(copyCardBtn, "Copy Card button is present");

  // Test copy link
  clipboardText = "";
  await act(async () => {
    copyLinkBtn.click();
  });
  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558");
});

console.log("\n------------------------------------------------------------------");
console.log(`Verification Results: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}

await act(async () => {
  root.unmount();
});

