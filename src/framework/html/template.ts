import { HtmlEscapedString } from "./html.ts";
import { type RouterContext } from "../routing/types.ts";
import { createHtmlResponse } from "../routing/response.ts";

type TemplateFunction = (
  ctx: RouterContext,
  ...args: never[]
) => HtmlEscapedString;

type ResponseFunction<T extends TemplateFunction> = T extends
  (ctx: RouterContext) => HtmlEscapedString ? (ctx: RouterContext, status?: number) => Response
  : T extends (ctx: RouterContext, props: infer P) => HtmlEscapedString
    ? (ctx: RouterContext, props: P, status?: number) => Response
  : (ctx: RouterContext, status?: number) => Response;

export function createView<T extends TemplateFunction>(
  template: T,
): ResponseFunction<T> {
  return ((ctx: RouterContext, propsOrStatus?: unknown, status = 200) => {
    if (typeof propsOrStatus === "number") {
      return createHtmlResponse(template(ctx), propsOrStatus);
    }

    return createHtmlResponse(
      template(ctx, propsOrStatus as never),
      status,
    );
  }) as ResponseFunction<T>;
}
