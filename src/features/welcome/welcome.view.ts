import { html } from "../../framework/html/html.ts";
import { createView } from "../../framework/html/template.ts";
import { baseLayout } from "../../views/layouts/base-layout.ts";

export const welcomeView = createView((ctx) => {
  return baseLayout({
    title: "Open Manuscript — Writasaurus",
    bodyClass: "welcome-mode",
    scripts: html`
      <link rel="stylesheet" href="${ctx.asset("features/welcome/welcome.client.css")}">
      <script type="module" src="${ctx.asset("features/welcome/welcome.client.ts")}"></script>
    `,
    content: html`
      <div class="welcome-container">
        <header class="welcome-header">
          <a class="brand" href="/about">Writasaurus</a>
        </header>

        <main class="welcome-content">
          <section class="welcome-card stack">
            <h2>Open Manuscript</h2>
            <p>Open a Markdown manuscript or begin with a blank document.</p>
            <div class="welcome-actions">
              <button type="button" id="welcome-open" class="button primary">Browse Local File</button>
              <button type="button" id="welcome-new" class="button">Start New Manuscript</button>
              <button type="button" id="welcome-sample" class="button">Load Sample Novel</button>
              <input id="welcome-file-input" type="file" accept=".md,.markdown,.txt" hidden>
            </div>
            <div class="welcome-footer">
              <a href="/" class="return-link">← Return to Editor</a>
            </div>
          </section>
        </main>
      </div>
    `,
  });
});
