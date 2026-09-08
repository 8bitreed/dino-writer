/* a basic wrapper around deno's @std/http/unstable-route */

import { type Route } from "@std/http/unstable-route";

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";
type Router = {
  addRoute: (
    method: HTTPMethod,
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  all: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  get: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  post: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  put: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  delete: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  options: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  head: (
    pathname: string | undefined,
    handler: (req: Request) => Response | Promise<Response>,
  ) => void;
  addRoutes: (route: Route[]) => void;
  getRoutes: () => Route[];
};

const addRoute = (routes: Route[], route: Route): Route[] => {
  return [...routes, route];
};

const addRoutes = (routes: Route[], newRoutes: Route[]): Route[] => {
  return [...routes, ...newRoutes];
};

const processHandler = (
  _method: HTTPMethod,
  handler: (req: Request) => Response | Promise<Response>,
) => {
  return (req: Request) => {
    // if (req.method !== method) {
    //   return new Response("Method Not Allowed", { status: 405 });
    // }
    return handler(req);
  };
};

export const createRouter = (pathnamePrefix?: string): Router => {
  const prefix = pathnamePrefix ?? "";

  let routes: Route[] = [];

  return {
    addRoute: (
      method: HTTPMethod,
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method,
        handler: (req: Request): Response | Promise<Response> =>
          processHandler(method, handler)(req),
      });
    },
    all: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        handler,
      });
    },
    post: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "POST",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("POST", handler)(req),
      });
    },
    get: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "GET",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("GET", handler)(req),
      });
    },
    put: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "PUT",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("PUT", handler)(req),
      });
    },
    delete: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "DELETE",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("DELETE", handler)(req),
      });
    },
    options: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "OPTIONS",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("OPTIONS", handler)(req),
      });
    },
    head: (
      pathname: string | undefined,
      handler: (req: Request) => Response | Promise<Response>,
    ) => {
      routes = addRoute(routes, {
        pattern: new URLPattern({ pathname: prefix + pathname }),
        method: "HEAD",
        handler: (req: Request): Response | Promise<Response> =>
          processHandler("HEAD", handler)(req),
      });
    },
    addRoutes: (newRoutes) => {
      routes = addRoutes(routes, newRoutes);
    },
    getRoutes: (): Route[] => routes,
  };
};
