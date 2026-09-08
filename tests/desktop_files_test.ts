import { Hono } from "@hono/hono";
import { desktopFileRoutes } from "../src/routes/desktop-files.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

Deno.test("desktop save updates the selected Markdown file on disk", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".desktop-files-" });
  const path = `${directory}/novel.md`;
  const original = "<!-- chapter: Chapter 1 -->\n\nOriginal text.\n";
  const changed = "<!-- chapter: Chapter 1 -->\n\nChanged on disk.\n";
  try {
    await Deno.writeTextFile(path, original);
    const routes = desktopFileRoutes({
      available: () => Promise.resolve(true),
      chooseFile: () => Promise.resolve(path),
    });
    const app = new Hono().route("/", routes);

    const opened = await app.request("/editor/files/open", {
      method: "POST",
      headers: { "x-writer-tools": "1" },
    });
    assert(opened.status === 200);
    assert((await opened.json()).content === original);

    const saved = await app.request("/editor/files/save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-writer-tools": "1",
      },
      body: JSON.stringify({
        content: changed,
        filename: "novel.md",
        saveAs: false,
      }),
    });
    assert(saved.status === 200);
    assert((await Deno.readTextFile(path)) === changed);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
