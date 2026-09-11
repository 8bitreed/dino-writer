import { loadAssets } from "./framework/assets.ts";
import { createJsonResponse } from "./framework/routing/response.ts";
import { checkIsDesktop } from "./lib/desktop.ts";
import { isCsrfSafe } from "./lib/security/csrf.ts";
import { type Middleware } from "./framework/routing/types.ts";
import { createRouter } from "./framework/routing/router.ts";
import { Routes } from "./routes/routes.ts";

/* TYPES */
export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

/* CODE */

/**
 * Creates the application with all routes and middleware.
 * Middleware is global, meaning it will be applied to all routes.
 * If you need to do an auth check or something similar, you can do it explicitly in the route handler itself.
 */
export function createApp(): App {
  const asset = loadAssets();

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
    asset,
    isDesktop: checkIsDesktop,
    json,
  }, globalMiddleware);

  router = Routes(router);

  return router.init();
}
