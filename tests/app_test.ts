import { createApp } from "../src/app.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

const app = await createApp();

Deno.test("renders editor on root route with its registered asset entries", async () => {
  const response = await app.request("/");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes('id="chapter-list"'));
  assert(page.includes('contenteditable="true"'));
  assert(!page.includes("app.js"));
  assert(page.includes("/assets/features-editor-editor.client-"));
  assert(page.includes(".js"));
  assert(page.includes("/assets/features-editor-editor-"));
  assert(page.includes(".css"));
});

Deno.test("returns 404 for missing routes and protected manifest", async () => {
  const missing = await app.request("/not-found");
  assert(missing.status === 404);

  const manifest = await app.request("/manifest.json");
  assert(manifest.status === 404);
});
