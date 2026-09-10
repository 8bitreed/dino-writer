/* a basic wrapper around deno's @std/http/unstable-route */

import { type Route, route } from "@std/http/unstable-route";
import { AssetResolver } from "../lib/assets.ts";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";
export type Router = {
  all: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  get: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  post: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  put: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  delete: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  options: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  head: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: RouterContext) => Response | Promise<Response>,
  ) => void;
  addRoutes: (route: Route[]) => void;
  getRoutes: () => Route[];
  init: () => ((req: Request) => Response | Promise<Response>) & {
    fetch: (req: Request) => Response | Promise<Response>;
    request(url: string | URL, init?: RequestInit): Promise<Response>;
  };
};

export type RouterContext = {
  assets: AssetResolver;
  isDesktop: () => Promise<boolean> | boolean;
  // html: <T extends Record<string, unknown>>(
  //   template: (data?: T) => HtmlEscapedString | HtmlEscapedString,
  //   data: T,
  // ) => Response;
  json: (data: Record<string, unknown>, status?: number) => Response;
};

export type Middleware = (
  currentRequest: Request,
  globalContext?: RouterContext,
) => boolean | Response | Promise<Response | boolean>;

/* RESPONSES */

const addRoutes = (routes: Route[], newRoutes: Route[]): Route[] => {
  return [...routes, ...newRoutes];
};

const processHandler = async (
  _method: HTTPMethod | null,
  handler: (req: Request, context: RouterContext) => Response | Promise<Response>,
  context: RouterContext,
  req: Request,
  globalMiddleware: Middleware | null,
): Promise<Response> => {
  if (globalMiddleware) {
    const result = await globalMiddleware(req, context);

    if (result instanceof Response) {
      return result;
    }

    if (result === false) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return await handler(req, context);
};

export const createRouter = (
  globalContext: RouterContext,
  globalMiddleware: Middleware | null,
): Router => {
  let routes: Route[] = [];

  const addRoute = (
    method: HTTPMethod | null,
    pathname: string | undefined,
    handler: (req: Request, context: RouterContext) => Response | Promise<Response>,
    routes: Route[],
  ): Route[] => {
    return [
      ...routes,
      {
        ...(method && { method }),
        pattern: new URLPattern({ pathname }),
        handler: (req: Request): Response | Promise<Response> =>
          processHandler(method, handler, globalContext, req, globalMiddleware),
      },
    ];
  };

  return {
    all: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute(null, pathname, handler, routes);
    },
    post: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("POST", pathname, handler, routes);
    },
    get: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("GET", pathname, handler, routes);
    },
    put: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("PUT", pathname, handler, routes);
    },
    delete: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("DELETE", pathname, handler, routes);
    },
    options: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("OPTIONS", pathname, handler, routes);
    },
    head: (
      pathname: string | undefined,
      handler: (req: Request, ctx: RouterContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("HEAD", pathname, handler, routes);
    },
    addRoutes: (newRoutes) => {
      routes = addRoutes(routes, newRoutes);
    },
    getRoutes: (): Route[] => routes,
    init: () => {
      const handler = route(routes, () => new Response("Not Found", { status: 404 }));

      return Object.assign(handler, {
        fetch: handler,
        request(url: string | URL, init?: RequestInit): Promise<Response> {
          const full = url.toString().startsWith("http")
            ? url.toString()
            : `http://localhost${url}`;
          return Promise.resolve(handler(new Request(full, init)));
        },
      });
    },
  };
};
