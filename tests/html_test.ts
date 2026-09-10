import {
  escapeToBuffer,
  html,
  HtmlEscapedString,
  isSafeHtml,
  raw,
  type StringBuffer,
  stringBufferToString,
} from "../src/lib/html.ts";

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

Deno.test("html: HtmlEscapedString extends String and has isEscaped", () => {
  const safe = raw("<span>Safe</span>");
  assertEquals(safe instanceof String, true);
  assertEquals(safe instanceof HtmlEscapedString, true);
  assertEquals(safe.isEscaped, true);
  assertEquals(isSafeHtml(safe), true);
  assertEquals(isSafeHtml("plain string"), false);
  assertEquals(safe.includes("Safe"), true);
  assertEquals(safe.slice(0, 6), "<span>");
});

Deno.test("html: handles deeply nested arrays with .flat(Infinity)", () => {
  const nested = [["a", ["<b>", ["c", raw("<d>")]]]];
  const result = html`<div>${nested}</div>`;
  assertEquals(result.toString(), "<div>a&lt;b&gt;c<d></div>");
});

Deno.test("html: supports Promise children returning Promise<HtmlEscapedString>", async () => {
  const asyncUser = Promise.resolve("Alice <Admin>");
  const asyncSafe = Promise.resolve(raw("<em>verified</em>"));
  const resultPromise = html`<p>${asyncUser} is ${asyncSafe}</p>`;

  assertEquals(resultPromise instanceof Promise, true);
  const result = await resultPromise;
  assertEquals(result instanceof HtmlEscapedString, true);
  assertEquals(result.isEscaped, true);
  assertEquals(result.toString(), "<p>Alice &lt;Admin&gt; is <em>verified</em></p>");
});

Deno.test("html: supports async array with Promise children", async () => {
  const items = [Promise.resolve("Item 1"), Promise.resolve("Item <2>")];
  const result = await html`<ul>${items}</ul>`;
  assertEquals(result.toString(), "<ul>Item 1Item &lt;2&gt;</ul>");
});

Deno.test("html: escapeToBuffer writes directly to buffer", () => {
  const buffer: StringBuffer = [];
  escapeToBuffer("Hello <world> & 'friends'", buffer);
  assertEquals(buffer.join(""), "Hello &lt;world&gt; &amp; &#39;friends&#39;");
});

Deno.test("html: stringBufferToString supports callbacks", async () => {
  const buffer: StringBuffer = ["Hello "];
  const result = await stringBufferToString(buffer, [
    ({ buffer: buf }) => {
      buf.push("world");
    },
  ]);
  assertEquals(result.toString(), "Hello world");
});
