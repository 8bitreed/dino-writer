import { type Router } from "../../framework/routing/types.ts";
import { aboutView } from "./about.view.ts";

export const aboutRoutes = (router: Router): Router => {
  router.get("/about", (_req, ctx) => {
    return aboutView(ctx);
  });

  return router;
};
