import { createApp } from "../src/app.ts";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const mockAsset = () => ({ script: "/assets/test.js", styles: [] });

Deno.test("editor-api: status reports desktop and active file state", async () => {
  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
    },
  });

  const res = await app.request("/api/editor/status");
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.isDesktop, true);
  assertEquals(data.activeFile, null);
});

Deno.test("editor-api: save prompts user if no file loaded, then saves directly once loaded", async () => {
  const disk = new Map<string, string>();
  let chooseCallCount = 0;

  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
      chooseFile: (_action, suggested = "manuscript.md") => {
        chooseCallCount++;
        return Promise.resolve(`/home/user/documents/${suggested}`);
      },
      writeTextFile: (path, content) => {
        disk.set(path, content);
        return Promise.resolve();
      },
    },
  });

  // 1. Initial save: no file loaded -> chooseFile is called
  const res1 = await app.request("/api/editor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Chapter 1 text", filename: "my-novel.md" }),
  });
  assertEquals(res1.status, 200);
  const data1 = await res1.json();
  assertEquals(data1.name, "my-novel.md");
  assertEquals(chooseCallCount, 1);
  assertEquals(disk.get("/home/user/documents/my-novel.md"), "Chapter 1 text");

  // Status now shows active file
  const statusRes = await app.request("/api/editor/status");
  const statusData = await statusRes.json();
  assertEquals(statusData.activeFile, "my-novel.md");

  // 2. Subsequent save: file is loaded -> chooseFile is NOT called again
  const res2 = await app.request("/api/editor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Chapter 1 text updated" }),
  });
  assertEquals(res2.status, 200);
  assertEquals(chooseCallCount, 1); // Still 1!
  assertEquals(disk.get("/home/user/documents/my-novel.md"), "Chapter 1 text updated");

  // 3. Save As: user explicitly requests chooseFile again
  const res3 = await app.request("/api/editor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Copy of Chapter 1", filename: "novel-copy.md", saveAs: true }),
  });
  assertEquals(res3.status, 200);
  const data3 = await res3.json();
  assertEquals(data3.name, "novel-copy.md");
  assertEquals(chooseCallCount, 2);
  assertEquals(disk.get("/home/user/documents/novel-copy.md"), "Copy of Chapter 1");
});

Deno.test("editor-api: save returns 204 if user cancels file chooser", async () => {
  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
      chooseFile: () => Promise.resolve(null), // user clicked Cancel
    },
  });

  const res = await app.request("/api/editor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Some content" }),
  });
  assertEquals(res.status, 204);
});

Deno.test("editor-api: open file loads manuscript and close resets active file", async () => {
  const disk = new Map<string, string>([
    ["/home/user/docs/book.md", "# My Book\n\nContent here."],
  ]);

  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
      chooseFile: () => Promise.resolve("/home/user/docs/book.md"),
      readTextFile: (path) => {
        const content = disk.get(path);
        if (!content) throw new Error("File not found");
        return Promise.resolve(content);
      },
    },
  });

  const openRes = await app.request("/api/editor/open", { method: "POST" });
  assertEquals(openRes.status, 200);
  const openData = await openRes.json();
  assertEquals(openData.name, "book.md");
  assert(openData.content.includes("# My Book"));

  // Status shows active file
  const status1 = await (await app.request("/api/editor/status")).json();
  assertEquals(status1.activeFile, "book.md");

  // Close active file
  const closeRes = await app.request("/api/editor/close", { method: "POST" });
  assertEquals(closeRes.status, 200);

  // Status now shows no active file
  const status2 = await (await app.request("/api/editor/status")).json();
  assertEquals(status2.activeFile, null);
});

Deno.test("editor-api: status auto-restores the last opened file on first check", async () => {
  const disk = new Map<string, string>([
    ["/home/user/docs/novel.md", "# Restored Novel"],
  ]);
  let cleared = false;

  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
      readTextFile: (path) => {
        const content = disk.get(path);
        if (!content) throw new Error("File not found");
        return Promise.resolve(content);
      },
      loadLastFilePath: () => Promise.resolve("/home/user/docs/novel.md"),
      clearLastFilePath: () => {
        cleared = true;
        return Promise.resolve();
      },
    },
  });

  const status1 = await (await app.request("/api/editor/status")).json();
  assertEquals(status1.activeFile, "novel.md");
  assertEquals(status1.content, "# Restored Novel");
  assert(!cleared);

  // Subsequent status checks don't re-read the file from disk.
  disk.delete("/home/user/docs/novel.md");
  const status2 = await (await app.request("/api/editor/status")).json();
  assertEquals(status2.activeFile, "novel.md");
  assertEquals(status2.content, undefined);
});

Deno.test("editor-api: status clears an unreadable last file path", async () => {
  let cleared = false;

  const app = await createApp({
    asset: mockAsset,
    editorApiOptions: {
      isDesktop: () => true,
      readTextFile: () => Promise.reject(new Error("missing")),
      loadLastFilePath: () => Promise.resolve("/home/user/docs/missing.md"),
      clearLastFilePath: () => {
        cleared = true;
        return Promise.resolve();
      },
    },
  });

  const status = await (await app.request("/api/editor/status")).json();
  assertEquals(status.activeFile, null);
  assert(cleared);
});
