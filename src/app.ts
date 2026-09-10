import { loadAssets } from "./lib/assets.ts";
import { createJsonResponse } from "./lib/response.ts";
import { checkIsDesktop } from "./lib/desktop.ts";
import { isCsrfSafe } from "./lib/security/csrf.ts";
import { type Middleware } from "./routes/types.ts";
import { createRouter } from "./routes/router.ts";
import { Routes } from "./routes/routes.ts";

export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

export async function createApp(): Promise<App> {
  const assets = await loadAssets();

  const json = (data: Record<string, unknown>, status?: number) => {
    return createJsonResponse(data, status);
  };

  const globalMiddleware: Middleware = (req: Request) => {
    if (!isCsrfSafe(req)) {
      return new Response("Forbidden", { status: 403 });
    }
    return true;
  };

  let router = createRouter({
    assets: assets,
    isDesktop: checkIsDesktop,
    json,
  }, globalMiddleware);

  router = Routes(router);

  return router.init();
}
