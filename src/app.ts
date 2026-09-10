import { route } from "@std/http/unstable-route";
import { loadAssets } from "./lib/assets.ts";
import { createJsonResponse } from "./lib/response.ts";
import { checkIsDesktop } from "./lib/desktop.ts";
import { isCsrfSafe } from "./lib/security/csrf.ts";
import { createRouter } from "./routes/router.ts";
import { Routes } from "./routes/routes.ts";
// import { HtmlEscapedString } from "./lib/html.ts";

export interface CreateAppOptions {
  csrfProtection?: boolean;
}

export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

export async function createApp(options: CreateAppOptions = {}): Promise<App> {
  const assets = await loadAssets();

  // const html = <T extends Record<string, unknown>>(
  //   template: HtmlEscapedString,
  //   data: T,
  // ) => {
  //   return createHtmlResponse(template, 200);
  // };

  const json = (data: Record<string, unknown>, status?: number) => {
    return createJsonResponse(data, status);
  };

  let router = createRouter({
    assets: assets,
    isDesktop: checkIsDesktop,
    json,
  });

  router = Routes(router);

  const routeRequest = route(router.getRoutes(), () => new Response("Not Found", { status: 404 }));
  const handler = (request: Request, info?: Deno.ServeHandlerInfo) =>
    options.csrfProtection && !isCsrfSafe(request)
      ? new Response("Forbidden", { status: 403 })
      : routeRequest(request, info);

  return Object.assign(handler, {
    fetch: handler,
    request(url: string | URL, init?: RequestInit): Promise<Response> {
      const full = url.toString().startsWith("http") ? url.toString() : `http://localhost${url}`;
      return Promise.resolve(handler(new Request(full, init)));
    },
  });
}
