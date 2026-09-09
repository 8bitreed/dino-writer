import { type HtmlEscapedString } from "./html.ts";

export const createHtmlResponse = <T extends Record<string, unknown>>(
  template: HtmlEscapedString,
  status: number = 200,
): Response => {
  return new Response(template.toString(), {
    status,
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
