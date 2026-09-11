import { html, type HtmlEscapedString } from "../../framework/html/html.ts";

export interface LayoutOptions {
  title?: string;
  bodyClass?: string;
  content: HtmlEscapedString | string;
  scripts?: HtmlEscapedString;
}

export function baseLayout(
  options: LayoutOptions,
): HtmlEscapedString {
  const {
    title = "Writasaurus",
    bodyClass = "",
    content,
    scripts = html``,
  } = options;

  return html`
    <!doctype html>
    <html lang="en" data-theme="auto">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="theme-color" content="#f7f4ef">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <title>${title}</title>
        ${scripts}
      </head>
      <body class="${bodyClass}">
        ${content}
      </body>
    </html>
  `;
}
