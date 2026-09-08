// @ts-check
import { html } from "@hono/hono/html";
import { generateNames } from "../lib/names.js";

export function nameGrid() {
  const names = generateNames();
  return html`
    <div id="names-container" class="name-grid">
      <section class="card stack">
        <h2>Character Names</h2>
        <ul class="name-list">${names.characters.map((name) => html`<li>${name}</li>`)}</ul>
      </section>
      <section class="card stack">
        <h2>Place Names</h2>
        <ul class="name-list">${names.places.map((name) => html`<li>${name}</li>`)}</ul>
      </section>
    </div>
  `;
}
