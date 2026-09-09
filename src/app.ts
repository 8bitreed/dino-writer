import { route } from "@std/http/unstable-route";
import { loadAssets } from "./lib/assets.ts";
import { createHtmlResponse, createJsonResponse } from "./lib/response.ts";
import { checkIsDesktop } from "./lib/desktop.ts";
import { createRouter } from "./routes/router.ts";
import { Routes } from "./routes/routes.ts";
import { HtmlEscapedString } from "./lib/html.ts";


export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

export async function createApp(): Promise<App> {
  const assets = await loadAssets();

  const html = <T extends Record<string, unknown>>(
    template: (data?: T) => HtmlEscapedString | HtmlEscapedString,
    data: T,
  ) => {
    return createHtmlResponse(template, data, assets);
  };

  const json = (data: Record<string, unknown>, status?: number) => {
    return createJsonResponse(data, status);
  };

  let router = createRouter({
    assets: assets,
    isDesktop: checkIsDesktop,
    html,
    json,
  });

  router = Routes(router);

  const handler = route(router.getRoutes(), () => new Response("Not Found", { status: 404 }));

  return Object.assign(handler, {
    fetch: handler,
    request(url: string | URL, init?: RequestInit): Promise<Response> {
      const full = url.toString().startsWith("http") ? url.toString() : `http://localhost${url}`;
      return Promise.resolve(handler(new Request(full, init)));
    },
  });
}
