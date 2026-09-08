import { Hono } from "@hono/hono";
import { basename } from "@std/path";
import { chooseMarkdownFile, desktopFilesAvailable } from "../lib/desktop-files.ts";

const maxFileSize = 10 * 1024 * 1024;

export interface DesktopFileRouteOptions {
  chooseFile?: typeof chooseMarkdownFile;
  available?: typeof desktopFilesAvailable;
}

export function desktopFileRoutes(options: DesktopFileRouteOptions = {}): Hono {
  const chooseFile = options.chooseFile ?? chooseMarkdownFile;
  const available = options.available ?? desktopFilesAvailable;
  let activePath: string | null = null;
  const app = new Hono();

  app.get("/editor/files/status", async (c) =>
    c.json({
      available: await available(),
      name: activePath ? basename(activePath) : null,
    }));

  app.use("/editor/files/*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.header("x-writer-tools") !== "1") {
      return c.text("Forbidden", 403);
    }
    if (c.req.method !== "GET" && !(await available())) {
      return c.text("Desktop file access unavailable", 503);
    }
    await next();
  });

  app.post("/editor/files/open", async (c) => {
    const path = await chooseFile("open");
    if (!path) return c.body(null, 204);
    const info = await Deno.stat(path);
    if (!info.isFile || info.size > maxFileSize) return c.text("Invalid manuscript", 400);
    activePath = path;
    return c.json({ name: basename(path), content: await Deno.readTextFile(path) });
  });

  app.post("/editor/files/save", async (c) => {
    const payload = await c.req.json();
    if (
      !payload || typeof payload.content !== "string" ||
      new TextEncoder().encode(payload.content).byteLength > maxFileSize
    ) {
      return c.text("Invalid manuscript", 400);
    }
    if (payload.saveAs || !activePath) {
      const suggested = typeof payload.filename === "string"
        ? basename(payload.filename).replace(/[^\w .-]/g, "")
        : "manuscript.md";
      activePath = await chooseFile("save", suggested || "manuscript.md");
      if (!activePath) return c.body(null, 204);
    }
    await Deno.writeTextFile(activePath, payload.content);
    return c.json({ name: basename(activePath) });
  });

  return app;
}
