import { createApp } from "../src/app.ts";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("editor-api: status reports desktop and active file properties", async () => {
  const app = await createApp();
  const res = await app.request("/api/editor/status");
  assertEquals(res.status, 200);
  const data = await res.json();
  assert(typeof data.isDesktop === "boolean");
  assert(data.activeFile === null || typeof data.activeFile === "string");
  assert(data.activePath === null || typeof data.activePath === "string");
});

Deno.test("editor-api: close resets active file state", async () => {
  const app = await createApp();
  const closeRes = await app.request("/api/editor/close", {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  assertEquals(closeRes.status, 200);
  const closeData = await closeRes.json();
  assertEquals(closeData.ok, true);

  const statusRes = await app.request("/api/editor/status");
  assertEquals(statusRes.status, 200);
  const statusData = await statusRes.json();
  assertEquals(statusData.activeFile, null);
  assertEquals(statusData.activePath, null);
});

Deno.test("editor-api: save validates request payload", async () => {
  const app = await createApp();
  const invalidPayloads = [
    null,
    {},
    { content: 123 },
    { other: "field" },
  ];

  for (const payload of invalidPayloads) {
    const res = await app.request("/api/editor/save", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : "not-json",
    });
    assertEquals(res.status, 400);
    assertEquals(await res.text(), "Invalid manuscript content");
  }
});

Deno.test("editor-api: save returns 204 if no file chosen", async () => {
  const app = await createApp();
  await app.request("/api/editor/close", {
    method: "POST",
    headers: { origin: "http://localhost" },
  });

  const res = await app.request("/api/editor/save", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "content-type": "application/json",
    },
    body: JSON.stringify({ content: "Some content" }),
  });
  assertEquals(res.status, 204);
});

Deno.test("editor-api: open returns 204 if no file chosen", async () => {
  const app = await createApp();
  const res = await app.request("/api/editor/open", {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  assertEquals(res.status, 204);
});

Deno.test("editor-api: rejects unsafe requests without valid origin", async () => {
  const app = await createApp();
  const resMissing = await app.request("/api/editor/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Some content" }),
  });
  assertEquals(resMissing.status, 403);

  const resAttacker = await app.request("/api/editor/close", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assertEquals(resAttacker.status, 403);
});
