import type { AssetResolver } from "../../lib/assets.ts";
import { html, type HtmlEscapedString } from "../../lib/html.ts";

export interface LayoutOptions {
  title?: string;
  bodyClass?: string;
  content: HtmlEscapedString | string;
  nonce?: string;
}

export function renderLayout(
  asset: AssetResolver,
  options: LayoutOptions,
): HtmlEscapedString {
  const {
    title = "Manuscript",
    bodyClass = "",
    content,
    nonce,
  } = options;

  const { script, styles } = asset("editor");

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
        <script type="module" src="${script}" nonce="${nonce ?? ""}"></script>
      </head>
      <body class="${bodyClass}">
        ${content}
      </body>
    </html>
  `;
}
