import assert from "node:assert";
import { JSDOM } from "jsdom";

console.log("=====================================================");
console.log("Running End-to-End Verification: Share & Public Route");
console.log("=====================================================\n");

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

// -----------------------------------------------------------------
// 1. ShareCogmitModal: Hook order stability and generation options
// -----------------------------------------------------------------
await test("1. ShareCogmitModal opens and toggles without Hook order violation", async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost:3000",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
  global.HTMLElement = dom.window.HTMLElement;

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { ShareCogmitModal } = await import("../src/components/ShareCogmitModal.tsx");

  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  let capturedError = null;
  const errorHandler = (e) => {
    capturedError = e.error || e;
  };
  dom.window.addEventListener("error", errorHandler);

  let triggerOpen;
  function TestApp() {
    const [open, setOpen] = React.useState(false);
    triggerOpen = () => setOpen(true);

    return React.createElement(ShareCogmitModal, {
      open,
      onOpenChange: setOpen,
      title: "RootCog Title for Verification",
      authorId: "yvnow",
      shareUrl: "https://cogmit.com/cogmits/yvnow/yvnow_2026oct090558",
      content: "This is test content describing the RootCog capabilities.",
      published: "2026-10-09T18:25:55.449Z",
    });
  }

  root.render(React.createElement(TestApp));

  // Wait for initial render with open=false
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(container.innerHTML, "", "Modal should not be mounted when open=false");

  // Trigger open=true
  triggerOpen();
  await new Promise((r) => setTimeout(r, 50));

  assert.strictEqual(capturedError, null, "Opening modal must not produce any React Hook violations");
  assert.ok(container.innerHTML.includes("Share Cogmit"), "Modal header must be visible");
  assert.ok(container.innerHTML.includes("Cogmit Card"), "Cogmit Card option must be visible");
  assert.ok(container.innerHTML.includes("Rich Link"), "Rich Link option must be visible");
  assert.ok(container.innerHTML.includes("With description"), "With description toggle must be visible");
  assert.ok(container.innerHTML.includes("Dark Cogmit Card"), "Dark theme toggle must be visible");
  assert.ok(container.innerHTML.includes("Generate Cogmit Card"), "Generate button must be visible");

  root.unmount();
});

// -----------------------------------------------------------------
// 2. Share button does not trigger unintended navigation
// -----------------------------------------------------------------
await test("2. CogActionRow Share button has type='button' and calls onShare without navigation", async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost:3000/myCogs/test-cog/viewCog",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
  global.HTMLElement = dom.window.HTMLElement;

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CogActionRow } = await import("../src/components/CogActionRow.tsx");

  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  let shareClicked = false;
  root.render(React.createElement(CogActionRow, {
    mode: "view",
    project: "NPPCog",
    projectEnabled: false,
    shareEnabled: true,
    shareVisible: true,
    onShare: () => {
      shareClicked = true;
    },
    cogInEnabled: false,
    editCogEnabled: true,
    cogmitEnabled: false,
    optionsEnabled: false,
  }));

  await new Promise((r) => setTimeout(r, 50));

  const buttons = Array.from(container.querySelectorAll("button"));
  const shareBtn = buttons.find((b) => b.textContent?.includes("Share"));
  assert.ok(shareBtn, "Share button must be present in CogActionRow");
  assert.strictEqual(shareBtn.getAttribute("type"), "button", "Share button must explicitly have type='button'");

  shareBtn.click();
  assert.strictEqual(shareClicked, true, "Clicking Share must invoke onShare handler");
  assert.strictEqual(dom.window.location.pathname, "/myCogs/test-cog/viewCog", "Location must not change on click");

  root.unmount();
});

// -----------------------------------------------------------------
// 3. Dynamic route getPublishedCogmit retrieves author & published Cog data
// -----------------------------------------------------------------
await test("3. getPublishedCogmit retrieves data for yvnow/yvnow_2026oct090558", async () => {
  const { getPublishedCogmit } = await import("../src/app/cogmits/[authorId]/[cogmitId]/page.tsx");
  const cogmit = await getPublishedCogmit("yvnow", "yvnow_2026oct090558");

  assert.ok(cogmit !== null, "Published Cogmit must be found");
  assert.strictEqual(cogmit.authorId, "yvnow");
  assert.strictEqual(cogmit.cogmitId, "yvnow_2026oct090558");
  assert.ok(cogmit.title.length > 0, "Title must not be empty");
  assert.ok(cogmit.content.length > 0, "Content must not be empty");
  assert.strictEqual(cogmit.publishedAt, "2026-10-09T18:25:55.449Z");
});

// -----------------------------------------------------------------
// 4. Missing or invalid published Cogmit returns null gracefully
// -----------------------------------------------------------------
await test("4. getPublishedCogmit handles nonexistent Cogmit gracefully without crash", async () => {
  const { getPublishedCogmit } = await import("../src/app/cogmits/[authorId]/[cogmitId]/page.tsx");
  const cogmit = await getPublishedCogmit("yvnow", "nonexistent_cog_12345");
  assert.strictEqual(cogmit, null, "Missing cogmit must return null instead of throwing");
});

// -----------------------------------------------------------------
// 5. Metadata generation works for valid and missing Cogmits
// -----------------------------------------------------------------
await test("5. generateMetadata produces complete Open Graph and Twitter tags", async () => {
  const { generateMetadata } = await import("../src/app/cogmits/[authorId]/[cogmitId]/page.tsx");
  const meta = await generateMetadata({
    params: Promise.resolve({ authorId: "yvnow", cogmitId: "yvnow_2026oct090558" }),
  });

  assert.ok(meta.title, "Metadata title must be present");
  assert.ok(meta.openGraph?.title, "OG title must be present");
  assert.ok(meta.openGraph?.description, "OG description must be present");
  assert.strictEqual(meta.openGraph?.type, "article");
  assert.strictEqual(meta.twitter?.card, "summary");

  const missingMeta = await generateMetadata({
    params: Promise.resolve({ authorId: "yvnow", cogmitId: "nonexistent_cog_12345" }),
  });
  assert.strictEqual(missingMeta.title, "Cogmit Not Found");
  assert.strictEqual(missingMeta.openGraph?.title, "Cogmit Not Found");
});

// -----------------------------------------------------------------
// 6. Local production server HTTP testing
// -----------------------------------------------------------------
await test("6. Local production server responds with HTTP 200 for public Cogmit route", async () => {
  // Start server on port 3040 for testing
  const { spawn } = await import("node:child_process");
  const proc = spawn("cmd.exe", ["/c", "npx next start -p 3040"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  try {
    // Wait for server ready
    await new Promise((resolve, reject) => {
      proc.stdout.on("data", (data) => {
        if (data.toString().includes("Ready")) resolve();
      });
      proc.stderr.on("data", (data) => {
        // next start writes ready to stdout
      });
      setTimeout(() => resolve(), 3000);
    });

    const res = await fetch("http://localhost:3040/cogmits/yvnow/yvnow_2026oct090558");
    assert.strictEqual(res.status, 200, "Public route must respond with HTTP 200");
    const html = await res.text();
    assert.ok(!html.includes('id="__next_error__"'), "HTML must not contain Next.js error indicator");
    assert.ok(html.includes("Implement Consistent Share Modal"), "HTML must contain Cogmit title");

    // Also test reload (multiple requests)
    const reloadRes = await fetch("http://localhost:3040/cogmits/yvnow/yvnow_2026oct090558");
    assert.strictEqual(reloadRes.status, 200, "Reload must also respond with HTTP 200");

    // Test aboutCogmit
    const aboutRes = await fetch("http://localhost:3040/aboutCogmit");
    assert.strictEqual(aboutRes.status, 200, "AboutCogmit route must respond with HTTP 200");

    // Test missing cogmit returns 200 with Cogmit Not Found
    const notFoundRes = await fetch("http://localhost:3040/cogmits/yvnow/nonexistent_cogmit_999");
    assert.strictEqual(notFoundRes.status, 200, "Missing cogmit route must return 200 Not Found UI");
    const notFoundHtml = await notFoundRes.text();
    assert.ok(notFoundHtml.includes("Cogmit Not Found"), "Must display Cogmit Not Found UI");
  } finally {
    proc.kill();
  }
});

console.log("\n-----------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-----------------------------------------------------");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!");
}

