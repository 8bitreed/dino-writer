import { type Router } from "./router.ts";
import { editorView } from "../views/pages/editor.view.ts";
import { basename } from "@std/path";
import { serveDir } from "@std/http/file-server";

import {
  checkIsDesktop,
  chooseFile,
  clearLastFilePath,
  loadLastFilePath,
  saveLastFilePath,
} from "../lib/desktop.ts";

export const Routes = (router: Router): Router => {
  let activePath: string | null = null;
  let restoredLastFile = false;

  router.all("/", (_req, ctx) => {
    return ctx.html(editorView, {
      title: "Manuscript",
      bodyClass: "editor-mode",
    });
  });

  router.get("/api/editor/status", async (_req, ctx) => {
    const desktop = await checkIsDesktop();

    if (desktop && !activePath && !restoredLastFile) {
      restoredLastFile = true;
      const lastPath = await loadLastFilePath();
      if (lastPath) {
        try {
          const content = await Deno.readTextFile(lastPath);
          activePath = lastPath;
          return ctx.json({
            isDesktop: true,
            activeFile: basename(activePath),
            activePath,
            content,
          });
        } catch (error) {
          console.warn("Could not reopen the last file.", error);
          await clearLastFilePath();
        }
      }
    }

    return ctx.json({
      isDesktop: desktop,
      activeFile: activePath ? basename(activePath) : null,
      activePath,
    });
  });

  router.post("/api/editor/save", async (req, ctx) => {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload.content !== "string") {
      return new Response("Invalid manuscript content", { status: 400 });
    }

    if (payload.saveAs || !activePath) {
      const suggested = typeof payload.filename === "string" && payload.filename.trim()
        ? basename(payload.filename)
        : "manuscript.md";
      const chosen = await chooseFile("save", suggested);
      if (!chosen) {
        return new Response(null, { status: 204 });
      }
      activePath = chosen;
      await saveLastFilePath(activePath);
    }

    await Deno.writeTextFile(activePath, payload.content);
    return ctx.json({
      ok: true,
      name: basename(activePath),
      path: activePath,
    });
  });

  router.post("/api/editor/open", async (_req, ctx) => {
    const chosen = await chooseFile("open");
    if (!chosen) {
      return new Response(null, { status: 204 });
    }
    try {
      const content = await Deno.readTextFile(chosen);
      activePath = chosen;
      await saveLastFilePath(activePath);
      return ctx.json({
        ok: true,
        name: basename(activePath),
        path: activePath,
        content,
      });
    } catch (error) {
      console.error("Failed to read manuscript:", error);
      return new Response("Failed to read file", { status: 500 });
    }
  });

  router.post("/api/editor/close", async (_req, ctx) => {
    activePath = null;
    restoredLastFile = true;
    await clearLastFilePath();
    return ctx.json({ ok: true });
  });

  router.all("/*", (req) => {
    const { pathname } = new URL(req.url);
    if (pathname === "/manifest.json") {
      return new Response("Not Found", { status: 404 });
    }
    return serveDir(req, { fsRoot: "./dist", quiet: true });
  });

  return router;
};
