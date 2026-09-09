import { type HtmlEscapedString } from "./html.ts";

/* import layouts here: */
import { baseLayout } from "../views/layouts/base-layout.ts";
import { AssetResolver } from "./assets.ts";

export const createHtmlResponse = <T extends Record<string, unknown>>(
  template: (data?: T) => HtmlEscapedString | HtmlEscapedString,
  data: T,
  asset: AssetResolver,
): Response => {
  const page = baseLayout(asset, {
    title: data.title as string | undefined,
    bodyClass: data.bodyClass as string | undefined,
    content: template(data),
  });
  return new Response(page.toString(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy":
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'",
    },
  });
};
export const createJsonResponse = <T extends Record<string, unknown>>(
  data: T,
  status: number = 200,
): Response => {
  return Response.json(data, { status });
};
