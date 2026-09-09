import { serveDir } from "@std/http/file-server";
import { route } from "@std/http/unstable-route";
import { basename } from "@std/path";
import { loadAssets } from "./lib/assets.ts";
import { editorView } from "./views/pages/editor.view.ts";
import { createHtmlResponse, createJsonResponse } from "./lib/response.ts";
import {
  clearLastFilePath,
  chooseFile,
  checkIsDesktop,
  loadLastFilePath,
  saveLastFilePath,
} from "./lib/desktop.ts";
import { createRouter } from "./routes/router.ts";


export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

export async function createApp(): Promise<App> {

  const assets = await loadAssets();


  let activePath: string | null = null;
  let restoredLastFile = false;

  const router = createRouter({
    assets: assets,
    isDesktop: checkIsDesktop,
  });

  router.all("/", (_req) => {
    return createHtmlResponse(editorView, {
      title: "Manuscript",
      bodyClass: "editor-mode",
    }, assets);
  });

  router.get("/api/editor/status", async () => {
    const desktop = await checkIsDesktop();

    if (desktop && !activePath && !restoredLastFile) {
      restoredLastFile = true;
      const lastPath = await loadLastFilePath();
      if (lastPath) {
        try {
          const content = await  Deno.readTextFile(lastPath);
          activePath = lastPath;
          return createJsonResponse({
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

    return createJsonResponse({
      isDesktop: desktop,
      activeFile: activePath ? basename(activePath) : null,
      activePath,
    });
  });

  router.post("/api/editor/save", async (req) => {
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
    return createJsonResponse({
      ok: true,
      name: basename(activePath),
      path: activePath,
    });
  });

  router.post("/api/editor/open", async () => {
    const chosen = await chooseFile("open");
    if (!chosen) {
      return new Response(null, { status: 204 });
    }
    try {
      const content = await Deno.readTextFile(chosen);
      activePath = chosen;
      await saveLastFilePath(activePath);
      return createJsonResponse({
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

  router.post("/api/editor/close", async () => {
    activePath = null;
    restoredLastFile = true;
    await clearLastFilePath();
    return createJsonResponse({ ok: true });
  });

  router.get("/*", (req) => {
    const { pathname } = new URL(req.url);
    if (pathname === "/manifest.json") {
      return new Response("Not Found", { status: 404 });
    }
    return serveDir(req, { fsRoot: "./dist", quiet: true });
  });

  const handler = route(router.getRoutes(), () => new Response("Not Found", { status: 404 }));

  return Object.assign(handler, {
    fetch: handler,
    request(url: string | URL, init?: RequestInit): Promise<Response> {
      const full = url.toString().startsWith("http") ? url.toString() : `http://localhost${url}`;
      return Promise.resolve(handler(new Request(full, init)));
    },
  });
}
