/* a basic wrapper around deno's @std/http/unstable-route */

import { type Route } from "@std/http/unstable-route";
import { AssetResolver } from "../lib/assets.ts";
import { HtmlEscapedString } from "../lib/html.ts";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";
export type Router = {
  all: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  get: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  post: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  put: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  delete: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  options: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  head: (
    pathname: string | undefined,
    handler: (req: Request, globalContext: GlobalContext) => Response | Promise<Response>,
  ) => void;
  addRoutes: (route: Route[]) => void;
  getRoutes: () => Route[];
  createMiddleware: (middleware: Middleware) => Middleware;
};

type GlobalContext = {
  assets: AssetResolver;
  isDesktop: () => Promise<boolean> | boolean;
  html: <T extends Record<string, unknown>>(
    template: (data?: T) => HtmlEscapedString | HtmlEscapedString,
    data: T,
  ) => Response;
  json: (data: Record<string, unknown>, status?: number) => Response;
};

type Before = (req: Request) => Response;
type After = (req: Request, res: Response) => void;

type Middleware = {
  before: Before;
  after: After;
};

/* RESPONSES */

const addRoutes = (routes: Route[], newRoutes: Route[]): Route[] => {
  return [...routes, ...newRoutes];
};

const processHandler = (
  _method: HTTPMethod,
  handler: (req: Request, context: GlobalContext) => Response | Promise<Response>,
  context: GlobalContext,
  req: Request,
) => {
  return handler(req, context);
};

export const createRouter = (globalContext: GlobalContext, pathnamePrefix?: string): Router => {
  const prefix = pathnamePrefix ?? "";
  let routes: Route[] = [];

  const addRoute = (
    method: HTTPMethod | null,
    pathname: string | undefined,
    handler: (req: Request, context: GlobalContext) => Response | Promise<Response>,
    routes: Route[],
  ): Route[] => {
    return [
      ...routes,
      {
        ...(method && { method }),
        pattern: new URLPattern({ pathname: prefix + pathname }),
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("POST", handler, globalContext, req),
      },
    ];
  };

  return {
    all: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute(null, pathname, handler, routes);
    },
    post: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("POST", pathname, handler, routes);
    },
    get: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("GET", pathname, handler, routes);
    },
    put: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("PUT", pathname, handler, routes);
    },
    delete: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("DELETE", pathname, handler, routes);
    },
    options: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("OPTIONS", pathname, handler, routes);
    },
    head: (
      pathname: string | undefined,
      handler: (req: Request, ctx: GlobalContext) => Response | Promise<Response>,
    ) => {
      routes = addRoute("HEAD", pathname, handler, routes);
    },
    addRoutes: (newRoutes) => {
      routes = addRoutes(routes, newRoutes);
    },
    getRoutes: (): Route[] => routes,
    createMiddleware(middleware: Middleware): Middleware {
      // WIP
      return middleware;
    },
  };
};
