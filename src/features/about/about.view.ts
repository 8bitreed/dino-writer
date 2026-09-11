import { html } from "../../framework/html/html.ts";
import { createView } from "../../framework/html/template.ts";
import { baseLayout } from "../../views/layouts/base-layout.ts";

export const aboutView = createView((ctx) => {
  return baseLayout({
    title: "About — Writasaurus",
    bodyClass: "about-mode",
    scripts: html`
      <link rel="stylesheet" href="${ctx.asset("features/about/about.client.css")}">
    `,
    content: html`
      <div class="about-container">
        <header class="about-header">
          <span class="brand">Writasaurus</span>
        </header>

        <main class="about-content">
          <section class="about-card">
            <h2>About Writasaurus</h2>
            <p>
              Writasaurus is a local-first manuscript editor designed for focused long-form writing.
              Organize your chapters, track word counts in real time, and save directly to your device
              using plain markdown files.
            </p>
            <p>
              Built with Deno, Writasaurus works seamlessly in your browser and as a lightweight
              desktop application. Your writing stays entirely in your control—stored locally with
              automatic saving and flexible export options.
            </p>

            <div class="about-actions">
              <a href="/" class="button primary return-link">← Return to Editor</a>
            </div>
          </section>
        </main>
      </div>
    `,
  });
});
