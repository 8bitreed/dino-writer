import { Hono } from "@hono/hono";
import { html } from "@hono/hono/html";
import { serveStatic } from "@hono/hono/deno";
import { etag } from "@hono/hono/etag";
import { HTTPException } from "@hono/hono/http-exception";
import { methodNotAllowed } from "@hono/hono/method-not-allowed";
import { NONCE, secureHeaders } from "@hono/hono/secure-headers";
import { type AssetResolver, loadAssets } from "./lib/assets.ts";
import { desktopFileRoutes } from "./routes/desktop-files.ts";
import { editorRoutes } from "./routes/editor.ts";
import { pageRoutes } from "./routes/pages.ts";
import { postRoutes } from "./routes/posts.ts";
import { createLayout } from "./views/layout.ts";

export async function createApp(asset?: AssetResolver): Promise<Hono> {
  const resolvedAsset = asset ?? (await loadAssets());
  const layout = createLayout(resolvedAsset);
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

  app.route("/", pageRoutes(layout));
  app.route("/", postRoutes(layout));
  app.route("/", editorRoutes(layout));
  app.route("/", desktopFileRoutes());

  app.notFound((c) =>
    c.html(
      layout(c, {
        title: "404 - Not Found",
        body: html`
          <div class="not-found stack">
            <h1>404</h1>
            <p>The page you're looking for doesn't exist.</p>
            <p><a class="button primary" href="/">Back to Home</a></p>
          </div>
        `,
      }),
      404,
    )
  );
  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.text("Internal server error", 500);
  });
  return app;
}
