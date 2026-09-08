import { createApp } from "../src/app.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

const asset = (name: string) => ({
  script: `/assets/${name}`,
  styles: [`/assets/${name.replace(".js", ".css")}`],
});
const app = await createApp(asset);

Deno.test("renders posts and post Markdown", async () => {
  const response = await app.request("/");
  assert(response.status === 200);
  const page = await response.text();
  assert(page.includes("<h1>Latest Posts</h1>"));
  assert(page.includes("First Post"));
  assert(page.includes("/assets/app.js"));

  const post = await app.request("/posts/2026-02-25-first-post.md");
  assert(post.status === 200);
  assert((await post.text()).includes("<h1>First Post</h1>"));
});

Deno.test("renders name generator and refresh fragment", async () => {
  const page = await app.request("/name-gen");
  const source = await page.text();
  assert(page.status === 200);
  assert(source.includes("Anglo-Saxon"));
  assert(source.includes("/assets/name-gen.js"));

  const fragment = await app.request("/name-gen/names");
  assert(fragment.status === 200);
  assert((await fragment.text()).includes('id="names-container"'));
});

Deno.test("renders editor with its hashed asset entry", async () => {
  const response = await app.request("/editor");
  const page = await response.text();
  assert(response.status === 200);
  assert(page.includes('id="chapter-list"'));
  assert(page.includes('contenteditable="true"'));
  assert(page.includes("/assets/editor.js"));
  assert(page.includes("/assets/editor.css"));
});

Deno.test("returns custom 404 and method-not-allowed responses", async () => {
  const missing = await app.request("/posts/not-found.md");
  assert(missing.status === 404);
  assert((await missing.text()).includes("The page you're looking for"));

  const manifest = await app.request("/manifest.json");
  assert(manifest.status === 404);

  const response = await app.request("/about", { method: "DELETE" });
  assert(response.status === 405);
  assert(response.headers.get("allow")?.includes("GET"));
});
