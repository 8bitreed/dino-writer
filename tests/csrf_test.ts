import { isCsrfSafe } from "../src/lib/security/csrf.ts";

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}

Deno.test("allows safe and same-origin requests", () => {
  assert(isCsrfSafe(new Request("https://example.com")));
  assert(isCsrfSafe(
    new Request("https://example.com/save", {
      method: "POST",
      headers: { origin: "https://example.com" },
    }),
  ));
});

Deno.test("rejects unsafe requests from missing or different origins", () => {
  assert(!isCsrfSafe(new Request("https://example.com/save", { method: "POST" })));
  assert(
    !isCsrfSafe(
      new Request("https://example.com/save", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    ),
  );
});
