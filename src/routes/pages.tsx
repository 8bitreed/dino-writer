import { Hono } from "@hono/hono";
import { NameGrid } from "../views/names.tsx";

export function pageRoutes(_layout?: unknown): Hono {
  return new Hono()
    .get("/health", (c) => c.text("ok"))
    .get("/about", (c) =>
      c.render(
        <div class="stack prose">
          <h1>About Writer Tools</h1>
          <p>
            A focused desktop writing environment built with Deno, Hono, and vanilla JavaScript.
          </p>
          <p>
            Your manuscript stays on your device and can be opened, edited, and saved as Markdown.
          </p>
        </div>,
        { title: "About" },
      ))
    .get("/name-gen", (c) =>
      c.render(
        <div class="stack">
          <header class="page-heading">
            <h1>Name Generator</h1>
            <p>Anglo-Saxon inspired names for characters and places.</p>
          </header>
          <NameGrid />
          <button type="button" class="button primary center-button" id="generate-names">
            Generate New Names
          </button>
        </div>,
        {
          title: "Name Generator",
          scripts: ["name-gen.js"],
        },
      ))
    .get("/name-gen/names", (c) => c.html(<NameGrid />));
}
