import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { etag } from "@hono/hono/etag";
import { HTTPException } from "@hono/hono/http-exception";
import { methodNotAllowed } from "@hono/hono/method-not-allowed";
import { NONCE, secureHeaders } from "@hono/hono/secure-headers";
import { type AssetResolver, loadAssets } from "./lib/assets.ts";
import { desktopFileRoutes } from "./routes/desktop-files.ts";
import { editorRoutes } from "./routes/editor.tsx";
import { pageRoutes } from "./routes/pages.tsx";
import { postRoutes } from "./routes/posts.tsx";
import { createLayoutRenderer } from "./views/layout.tsx";

export async function createApp(asset?: AssetResolver): Promise<Hono> {
  const resolvedAsset = asset ?? (await loadAssets());
  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'", NONCE],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
      permissionsPolicy: {
        camera: [],
        geolocation: [],
        microphone: [],
      },
      referrerPolicy: "no-referrer",
    }),
  );
  app.use("*", methodNotAllowed({ app }));
  app.use("/manifest.json", (c) => Promise.resolve(c.notFound()));
  app.use("*", etag(), serveStatic({ root: "./dist" }));

  app.use("*", createLayoutRenderer(resolvedAsset));

  app.route("/", pageRoutes());
  app.route("/", postRoutes());
  app.route("/", editorRoutes());
  app.route("/", desktopFileRoutes());

  app.notFound((c) => {
    c.status(404);
    return c.render(
      <div class="not-found stack">
        <h1>404</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p>
          <a class="button primary" href="/">Back to Home</a>
        </p>
      </div>,
      { title: "404 - Not Found" },
    );
  });
  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.text("Internal server error", 500);
  });
  return app;
}
