/* a basic wrapper around deno's @std/http/unstable-route */

import { type Route, route } from "@std/http/unstable-route";
import {
  type AddRouteFn,
  type HTTPMethod,
  type Middleware,
  type RouteHandler,
  type Router,
  type RouterContext,
} from "./types.ts";

/* RESPONSES */

const processHandler = async (
  _method: HTTPMethod | null,
  handler: RouteHandler,
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

  const addRoute = (method: HTTPMethod | null): AddRouteFn => (pathname, handler) => {
    routes = [
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
    all: addRoute(null),
    get: addRoute("GET"),
    post: addRoute("POST"),
    put: addRoute("PUT"),
    delete: addRoute("DELETE"),
    options: addRoute("OPTIONS"),
    head: addRoute("HEAD"),
    addRoutes: (newRoutes) => {
      routes = [...routes, ...newRoutes];
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
