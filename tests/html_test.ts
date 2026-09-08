import { html, raw } from "../src/lib/html.ts";

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("html: basic template literal interpolation", () => {
  const name = "World";
  const result = html`<div>Hello, ${name}!</div>`;
  assertEquals(result.toString(), "<div>Hello, World!</div>");
});

Deno.test("html: escapes unsafe characters", () => {
  const unsafe = `<script>alert('xss') & "danger"</script>`;
  const result = html`<div>${unsafe}</div>`;
  assertEquals(
    result.toString(),
    "<div>&lt;script&gt;alert(&#39;xss&#39;) &amp; &quot;danger&quot;&lt;/script&gt;</div>",
  );
});

Deno.test("html: raw helper bypasses escaping", () => {
  const safeHtml = raw("<strong>Safe content</strong>");
  const result = html`<div>${safeHtml}</div>`;
  assertEquals(result.toString(), "<div><strong>Safe content</strong></div>");
});

Deno.test("html: nested html templates do not double-escape", () => {
  const inner = html`<span class="badge">Notice</span>`;
  const result = html`<div class="card">${inner}</div>`;
  assertEquals(result.toString(), '<div class="card"><span class="badge">Notice</span></div>');
});

Deno.test("html: handles null, undefined, false and numbers", () => {
  const result = html`<div>${null}${undefined}${false}count: ${42}</div>`;
  assertEquals(result.toString(), "<div>count: 42</div>");
});

Deno.test("html: handles arrays of values and nested templates", () => {
  const items = ["Item 1", "Item <2>", "Item 3"];
  const result = html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;
  assertEquals(
    result.toString(),
    "<ul><li>Item 1</li><li>Item &lt;2&gt;</li><li>Item 3</li></ul>",
  );
});
