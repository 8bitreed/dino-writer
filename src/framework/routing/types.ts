import { AssetResolver } from "../assets.ts";
import { type Route } from "@std/http/unstable-route";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";

export type RouteHandler = (
  req: Request,
  globalContext: RouterContext,
) => Response | Promise<Response>;

export type AddRouteFn = (
  pathname: string | undefined,
  handler: RouteHandler,
) => void;

export type Router = {
  all: AddRouteFn;
  get: AddRouteFn;
  post: AddRouteFn;
  put: AddRouteFn;
  delete: AddRouteFn;
  options: AddRouteFn;
  head: AddRouteFn;
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
  json: (data: Record<string, unknown>, status?: number) => Response;
};

export type Middleware = (
  currentRequest: Request,
  globalContext?: RouterContext,
) => boolean | Response | Promise<Response | boolean>;
