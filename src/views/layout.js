// @ts-check
import { html } from "@hono/hono/html";

/**
 * @typedef {{
 *   title: string,
 *   scripts?: string[],
 *   bodyClass?: string,
 *   mainClass?: string,
 *   header?: import("@hono/hono/utils/html").HtmlEscapedString |
 *     Promise<import("@hono/hono/utils/html").HtmlEscapedString>,
 *   footer?: import("@hono/hono/utils/html").HtmlEscapedString |
 *     Promise<import("@hono/hono/utils/html").HtmlEscapedString>,
 *   body: import("@hono/hono/utils/html").HtmlEscapedString |
 *     Promise<import("@hono/hono/utils/html").HtmlEscapedString>
 * }} LayoutOptions
 */

/** @param {(name: string) => {script: string, styles: string[]}} asset */
export function createLayout(asset) {
  /** @param {import("@hono/hono").Context} context @param {LayoutOptions} options */
  return function layout(
    context,
    { title, scripts = [], bodyClass = "", mainClass = "page", header, footer, body },
  ) {
    const nonce = context.get("secureHeadersNonce");
    const entries = ["app.js", ...scripts].map(asset);
    const styles = [...new Set(entries.flatMap((entry) => entry.styles))];
    header ??= html`
      <header class="site-header">
        <a class="brand" href="/">Writer Tools</a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">Menu</button>
        <nav class="site-nav" id="site-nav">
          <a href="/">Posts</a>
          <a href="/name-gen">Name Generator</a>
          <a href="/editor">Editor</a>
          <a href="/about">About</a>
        </nav>
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">Theme</button>
      </header>
    `;
    footer ??= html`
      <footer class="site-footer">
        <span>&copy; ${new Date().getFullYear()} Writer Tools</span>
        <a href="/about">About</a>
      </footer>
    `;
    return html`
      <!doctype html>
      <html lang="en" data-theme="auto">
        <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <meta name="theme-color" content="#f7f4ef">
              <link rel="icon" href="/favicon.svg" type="image/svg+xml">
              <title>${title}</title>
              ${styles.map((href) => html`<link rel="stylesheet" href="${href}">`)}
              ${entries.map((entry) =>
                html`<script type="module" src="${entry.script}" nonce="${nonce}"></script>`
              )}
            </head>
        <body class="${bodyClass}">
          ${header}
          <main class="${mainClass}">${body}</main>
          ${footer}
        </body>
      </html>
    `;
  };
}
