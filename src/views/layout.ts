import type { Context } from "@hono/hono";
import { html } from "@hono/hono/html";
import type { HtmlEscapedString } from "@hono/hono/utils/html";
import type { AssetResolver } from "../lib/assets.ts";

export interface LayoutOptions {
  title: string;
  scripts?: string[];
  bodyClass?: string;
  mainClass?: string;
  header?: HtmlEscapedString | Promise<HtmlEscapedString>;
  footer?: HtmlEscapedString | Promise<HtmlEscapedString>;
  body: HtmlEscapedString | Promise<HtmlEscapedString>;
}

export type LayoutFunction = (
  context: Context,
  options: LayoutOptions,
) => HtmlEscapedString | Promise<HtmlEscapedString>;

export function createLayout(asset: AssetResolver): LayoutFunction {
  return function layout(
    context: Context,
    { title, scripts = [], bodyClass = "", mainClass = "page", header, footer, body }:
      LayoutOptions,
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
