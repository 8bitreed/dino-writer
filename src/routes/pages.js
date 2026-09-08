// @ts-check
import { Hono } from "@hono/hono";
import { html } from "@hono/hono/html";
import { nameGrid } from "../views/names.js";

/** @param {ReturnType<import("../views/layout.js").createLayout>} layout */
export function pageRoutes(layout) {
  return new Hono()
    .get("/health", (c) => c.text("ok"))
    .get("/about", (c) =>
      c.html(layout(c, {
        title: "About",
        body: html`
          <div class="stack prose">
            <h1>About Writer Tools</h1>
            <p>A focused desktop writing environment built with Deno, Hono, and vanilla JavaScript.</p>
            <p>Your manuscript stays on your device and can be opened, edited, and saved as Markdown.</p>
          </div>
        `,
      })))
    .get("/name-gen", (c) =>
      c.html(layout(c, {
        title: "Name Generator",
        scripts: ["name-gen.js"],
        body: html`
          <div class="stack">
            <header class="page-heading">
              <h1>Name Generator</h1>
              <p>Anglo-Saxon inspired names for characters and places.</p>
            </header>
            ${nameGrid()}
            <button class="button primary center-button" id="generate-names">Generate New Names</button>
          </div>
        `,
      })))
    .get("/name-gen/names", (c) => c.html(nameGrid()));
}
