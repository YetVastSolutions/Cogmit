import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("==================================================================");
console.log("Running Cogmit Card Generation-to-Preview Transition Test Suite");
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

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { ShareCogmitModal } = await import("../src/components/ShareCogmitModal.tsx");
const { generateCardSvg, getCardDimensions } = await import("../src/lib/card-renderer.ts");

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
// Test 1: Initial state before clicking Generate (Options visible, Preview hidden)
// ---------------------------------------------------------------------------------
await test("1. Before clicking Generate: options & toggles are visible, card preview is not rendered", async () => {
  await act(async () => {
    root.render(React.createElement(TestModalWrapper, { initialOpen: true }));
  });

  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must be present before generation");

  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description toggle must be present");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "With description must default to false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark Cogmit Card toggle must be present");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark Cogmit Card must default to true");

  // Preview container must not be rendered before clicking generate
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.strictEqual(previewImg, null, "Preview image must NOT be rendered before clicking generate");

  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Change options")
  );
  assert.strictEqual(changeOptionsBtn, undefined, "Change options button must not appear before generation");
});

// ---------------------------------------------------------------------------------
// Test 2: Clicking Generate transitions to 4:3 Landscape Card Preview (Config A)
// ---------------------------------------------------------------------------------
await test("2. Clicking Generate: transitions away from options and displays 4:3 landscape preview", async () => {
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate button must exist");

  await act(async () => {
    generateBtn.click();
  });

  // Options row must now be hidden
  const optionsRow = container.querySelector("#toggle-with-description")?.closest("div.flex-wrap");
  assert.ok(optionsRow?.classList.contains("hidden"), "Initial generation-options row must be hidden after generation");

  // Preview image must now be rendered with data URL
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Preview image element must be rendered after clicking generate");
  assert.ok(previewImg.getAttribute("src")?.startsWith("data:image/svg+xml"), "Preview image src must be a valid SVG data URI");

  // Transition bar must display configuration info and 'Change options' button
  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Change options")
  );
  assert.ok(changeOptionsBtn, "Change options button must be visible in preview mode");
  assert.ok(container.innerHTML.includes("Landscape 4:3"), "Mode indicator must show Landscape 4:3");
  assert.ok(container.innerHTML.includes("Dark theme"), "Theme indicator must show Dark theme");

  // Actions must make Download Cogmit Card, Copy Link, Share available
  const downloadBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Download Cogmit Card") || b.textContent?.includes("Download PNG")
  );
  assert.ok(downloadBtn, "Download Cogmit Card button must be available");

  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Link")
  );
  assert.ok(copyLinkBtn, "Copy Link button must be available in footer");

  const shareBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.trim() === "Share"
  );
  assert.ok(shareBtn, "Share button must be available in footer");
});

// ---------------------------------------------------------------------------------
// Test 3: Change options, enable 'With description', and generate again (Config B)
// ---------------------------------------------------------------------------------
await test("3. Change options, enable 'With description' and generate again: produces portrait preview", async () => {
  // Click Change options
  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Change options")
  );
  assert.ok(changeOptionsBtn, "Change options button must exist");

  await act(async () => {
    changeOptionsBtn.click();
  });

  // Options row should be visible again
  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description toggle must be visible after clicking Change options");

  // Enable With description
  await act(async () => {
    toggleDesc.click();
  });
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "true", "With description toggle must now be checked");

  // Click Generate Cogmit Card again
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  assert.ok(generateBtn, "Generate Cogmit Card button must be visible");

  await act(async () => {
    generateBtn.click();
  });

  // Portrait preview must appear
  assert.ok(container.innerHTML.includes("Portrait"), "Preview mode indicator must show Portrait");
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.ok(previewImg, "Portrait preview image must be rendered");

  // Aspect-[4/3] class should NOT be on the container when withDescription is true
  const previewContainer = previewImg.closest("div.overflow-hidden");
  assert.ok(previewContainer, "Preview container must exist");
  assert.ok(!previewContainer.classList.contains("aspect-[4/3]"), "Portrait card must not enforce aspect-[4/3]");
});

// ---------------------------------------------------------------------------------
// Test 4: Switching between Dark and Light themes
// ---------------------------------------------------------------------------------
await test("4. Dark and Light themes generate valid themed SVGs and switch cleanly", async () => {
  // Click Change options
  const changeOptionsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Change options")
  );
  await act(async () => {
    changeOptionsBtn.click();
  });

  // Switch to Light theme
  const toggleDark = container.querySelector("#toggle-dark-theme");
  await act(async () => {
    toggleDark.click();
  });
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "false", "Dark theme should now be unchecked (Light theme)");

  // Generate light card
  const generateBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Generate Cogmit Card")
  );
  await act(async () => {
    generateBtn.click();
  });

  assert.ok(container.innerHTML.includes("Light theme"), "Preview mode indicator must show Light theme");
  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  const previewContainer = previewImg.closest("div.overflow-hidden");
  assert.ok(previewContainer.classList.contains("bg-[#F8F5FA]"), "Light theme preview container must use light background bg-[#F8F5FA]");
});

// ---------------------------------------------------------------------------------
// Test 5: Verify Copy Link action
// ---------------------------------------------------------------------------------
await test("5. Copy Link action copies shareUrl to clipboard and indicates success", async () => {
  const copyLinkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Copy Link")
  );
  assert.ok(copyLinkBtn, "Copy Link button must exist");

  await act(async () => {
    copyLinkBtn.click();
  });

  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558", "shareUrl must be copied to clipboard");
  assert.ok(container.innerHTML.includes("Copied Link!"), "Copied Link! confirmation must be shown");
});

// ---------------------------------------------------------------------------------
// Test 6: Verify Share action fallback
// ---------------------------------------------------------------------------------
await test("6. Share action executes without crashing and falls back to copy if navigator.share absent", async () => {
  const shareBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.trim() === "Share"
  );
  assert.ok(shareBtn, "Share button must exist");

  clipboardText = "";
  await act(async () => {
    shareBtn.click();
  });

  assert.strictEqual(clipboardText, "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558", "Share fallback must copy public URL");
});

// ---------------------------------------------------------------------------------
// Test 7: Closing and reopening modal restores default options
// ---------------------------------------------------------------------------------
await test("7. Closing and reopening modal restores default options (cardGenerated: false, desc: OFF, dark: ON)", async () => {
  // Close the modal
  await act(async () => {
    setOpenState(false);
    await new Promise((r) => setTimeout(r, 60));
  });

  // Reopen the modal
  await act(async () => {
    setOpenState(true);
    await new Promise((r) => setTimeout(r, 60));
  });

  const toggleDesc = container.querySelector("#toggle-with-description");
  assert.ok(toggleDesc, "With description toggle must exist after reopen");
  assert.strictEqual(toggleDesc.getAttribute("aria-checked"), "false", "With description must reset to false");

  const toggleDark = container.querySelector("#toggle-dark-theme");
  assert.ok(toggleDark, "Dark theme toggle must exist after reopen");
  assert.strictEqual(toggleDark.getAttribute("aria-checked"), "true", "Dark theme must reset to true");

  const previewImg = container.querySelector("img[alt^='Cogmit Card']");
  assert.strictEqual(previewImg, null, "Preview must not be visible upon reopening");
});

// ---------------------------------------------------------------------------------
// Test 8: Generation options and dimensions accuracy for both configurations
// ---------------------------------------------------------------------------------
await test("8. Card renderer produces exact dimensions for both Config A (1200x900) and Config B", async () => {
  const dimLandscape = getCardDimensions(false);
  assert.strictEqual(dimLandscape.width, 1200, "Landscape width must be 1200");
  assert.strictEqual(dimLandscape.height, 900, "Landscape height must be 900");

  const svgLandscape = generateCardSvg({
    title: "Landscape Card Verification",
    excerpt: "Description ignored in landscape",
    url: "https://cogmit.com/cogs/test",
    withDescription: false,
    darkTheme: true,
  });
  assert.ok(svgLandscape.includes('viewBox="0 0 1200 900"'), "Landscape SVG viewBox must be 0 0 1200 900");

  const dimPortrait = getCardDimensions(true, {
    title: "Portrait Card Verification",
    excerpt: "Detailed description of content.",
  });
  assert.strictEqual(dimPortrait.width, 900, "Portrait width must be 900");
  assert.ok(dimPortrait.height >= 400 && dimPortrait.height <= 2000, "Portrait height must be content-driven");

  const svgPortrait = generateCardSvg({
    title: "Portrait Card Verification",
    excerpt: "Detailed description of content.",
    url: "https://cogmit.com/cogs/test",
    withDescription: true,
    darkTheme: true,
  });
  assert.ok(svgPortrait.includes(`viewBox="0 0 900 ${dimPortrait.height}"`), "Portrait SVG viewBox must match content height");
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
