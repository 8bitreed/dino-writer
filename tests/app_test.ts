import { createApp } from "../src/app.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

const app = await createApp();

Deno.test("renders editor on root route with its hashed asset entries", async () => {
  const response = await app.request("/");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes('id="chapter-list"'));
  assert(page.includes('contenteditable="true"'));
  assert(!page.includes("app.js"));
  assert(page.includes("/assets/editor.js"));
  assert(page.includes("/assets/editor.css"));
});

Deno.test("redirects /editor to /", async () => {
  const response = await app.request("/editor");
  assert(response.status === 301);
  assert(response.headers.get("location") === "/");
});

Deno.test("returns 404 and method-not-allowed responses", async () => {
  const missing = await app.request("/not-found");
  assert(missing.status === 404);

  const manifest = await app.request("/manifest.json");
  assert(manifest.status === 404);

  const response = await app.request("/", { method: "DELETE" });
  assert(response.status === 405);
  assert(response.headers.get("allow")?.includes("GET"));
});
