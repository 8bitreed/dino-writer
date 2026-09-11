import { type Router } from "../../framework/routing/types.ts";
import { welcomeView } from "./welcome.view.ts";

export const welcomeRoutes = (router: Router): Router => {
  router.get("/welcome", (_req, ctx) => {
    return welcomeView(ctx);
  });

  router.get("/open", (_req, ctx) => {
    return welcomeView(ctx);
  });

  return router;
};
