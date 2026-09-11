import { type Router } from "../framework/routing/types.ts";
import { serveDir } from "@std/http/file-server";
import { editorRoutes } from "../features/editor/editor.routes.ts";
import { aboutRoutes } from "../features/about/about.routes.ts";
import { welcomeRoutes } from "../features/welcome/welcome.routes.ts";

export const Routes = (router: Router): Router => {
  editorRoutes(router);
  aboutRoutes(router);
  welcomeRoutes(router);

  router.all("/*", (req) => {
    const { pathname } = new URL(req.url);
    if (pathname === "/manifest.json") {
      return new Response("Not Found", { status: 404 });
    }
    return serveDir(req, { fsRoot: "./dist", quiet: true });
  });

  return router;
};
