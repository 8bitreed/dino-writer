import { createApp } from "../src/app.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

const app = await createApp();

Deno.test("renders editor on root route with its registered asset entries", async () => {
  const response = await app.request("/");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes("Writasaurus"));
  assert(page.includes("<editor-sidebar"));
  assert(page.includes("<editor-toolbar"));
  assert(page.includes("<editor-canvas"));
  assert(!page.includes("<editor-modal"));
  assert(page.includes("<editor-statusbar"));
  assert(page.includes('id="chapter-list"'));
  assert(page.includes('contenteditable="true"'));
  assert(page.includes('href="/about"'));
  assert(page.includes('href="/open"'));
  assert(!page.includes("app.js"));
  assert(page.includes("/assets/features-editor-editor.client-"));
  assert(page.includes(".js"));
  assert(page.includes("/assets/features-editor-editor.client-"));
  assert(page.includes(".css"));
});

Deno.test("renders welcome page with open manuscript options and return to editor link", async () => {
  const response = await app.request("/welcome");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes("Open Manuscript"));
  assert(page.includes("Writasaurus"));
  assert(page.includes("Browse Local File"));
  assert(page.includes("Start New Manuscript"));
  assert(page.includes("Load Sample Novel"));
  assert(page.includes('href="/"'));
  assert(page.includes("Return to Editor"));
  assert(page.includes("/assets/features-welcome-welcome.client-"));
  assert(page.includes(".js"));
  assert(page.includes("/assets/features-welcome-welcome.client-"));
  assert(page.includes(".css"));

  const aliasResponse = await app.request("/open");
  assert(aliasResponse.status === 200);
  const aliasPage = await aliasResponse.text();
  assert(aliasPage.includes("Open Manuscript"));
});

Deno.test("renders about page with description and return to editor link", async () => {
  const response = await app.request("/about");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes("About Writasaurus"));
  assert(page.includes("Writasaurus"));
  assert(page.includes('href="/"'));
  assert(page.includes("Return to Editor"));
  assert(page.includes("/assets/features-about-about.client-"));
  assert(page.includes(".css"));
});

Deno.test("stylesheets include view transition rules for smooth page fades", async () => {
  const response = await app.request("/");
  const page = await response.text();
  const cssMatch = page.match(/href="(\/assets\/features-editor-editor\.client-[^"]+\.css)"/);
  assert(cssMatch !== null);
  const cssRes = await app.request(cssMatch[1]);
  assert(cssRes.status === 200);
  const css = await cssRes.text();
  assert(css.includes("view-transition"));
});

Deno.test("returns 404 for missing routes and protected manifest", async () => {
  const missing = await app.request("/not-found");
  assert(missing.status === 404);

  const manifest = await app.request("/manifest.json");
  assert(manifest.status === 404);
});
