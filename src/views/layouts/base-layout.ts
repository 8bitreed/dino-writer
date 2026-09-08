import type { AssetResolver } from "../../lib/assets.ts";
import { html, type HtmlEscapedString } from "../../lib/html.ts";

export interface LayoutOptions {
  title?: string;
  bodyClass?: string;
  content: HtmlEscapedString | string;
}

export function baseLayout(
  asset: AssetResolver,
  options: LayoutOptions,
): HtmlEscapedString {
  const {
    title = "Manuscript",
    bodyClass = "",
    content,
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
        <script type="module" src="${script}"></script>
      </head>
      <body class="${bodyClass}">
        ${content}
      </body>
    </html>
  `;
}
