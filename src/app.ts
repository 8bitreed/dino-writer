import { serveDir } from "@std/http/file-server";
import { type Route, route } from "@std/http/unstable-route";
import { basename } from "@std/path";
import { type AssetResolver, loadAssets } from "./lib/assets.ts";
import { editorView } from "./views/pages/editor-view.ts";
import {
  clearLastFilePath,
  defaultChooseFile,
  defaultIsDesktop,
  loadLastFilePath,
  saveLastFilePath,
} from "./lib/desktop.ts";

export interface EditorApiOptions {
  isDesktop?: () => Promise<boolean> | boolean;
  chooseFile?: (action: "open" | "save", suggestedName?: string) => Promise<string | null>;
  readTextFile?: (path: string) => Promise<string>;
  writeTextFile?: (path: string, content: string) => Promise<void>;
  loadLastFilePath?: () => Promise<string | null>;
  saveLastFilePath?: (path: string) => Promise<void>;
  clearLastFilePath?: () => Promise<void>;
}

export interface AppOptions {
  asset?: AssetResolver;
  editorApiOptions?: EditorApiOptions;
}

export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

export async function createApp(assetOrOptions?: AssetResolver | AppOptions): Promise<App> {
  const options = typeof assetOrOptions === "function"
    ? { asset: assetOrOptions }
    : (assetOrOptions ?? {});

  const asset = options.asset ?? (await loadAssets());
  const apiOptions = options.editorApiOptions ?? {};
  const isDesktop = apiOptions.isDesktop ?? defaultIsDesktop;
  const chooseFile = apiOptions.chooseFile ?? defaultChooseFile;
  const readTextFile = apiOptions.readTextFile ?? ((p: string) => Deno.readTextFile(p));
  const writeTextFile = apiOptions.writeTextFile ??
    ((p: string, c: string) => Deno.writeTextFile(p, c));
  const loadLastFile = apiOptions.loadLastFilePath ?? loadLastFilePath;
  const saveLastFile = apiOptions.saveLastFilePath ?? saveLastFilePath;
  const clearLastFile = apiOptions.clearLastFilePath ?? clearLastFilePath;

  let activePath: string | null = null;
  let restoredLastFile = false;

  const routes: Route[] = [
    {
      pattern: new URLPattern({ pathname: "/" }),
      handler: (req) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          return new Response("Method Not Allowed", {
            status: 405,
            headers: { Allow: "GET, HEAD" },
          });
        }
        const page = editorView(asset);
        return new Response(page.toString(), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-security-policy":
              "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'",
          },
        });
      },
    },
    {
      pattern: new URLPattern({ pathname: "/editor" }),
      handler: () => new Response(null, { status: 301, headers: { Location: "/" } }),
    },
    {
      pattern: new URLPattern({ pathname: "/api/editor/status" }),
      method: "GET",
      handler: async () => {
        const desktop = await isDesktop();

        if (desktop && !activePath && !restoredLastFile) {
          restoredLastFile = true;
          const lastPath = await loadLastFile();
          if (lastPath) {
            try {
              const content = await readTextFile(lastPath);
              activePath = lastPath;
              return Response.json({
                isDesktop: true,
                activeFile: basename(activePath),
                activePath,
                content,
              });
            } catch (error) {
              console.warn("Could not reopen the last file.", error);
              await clearLastFile();
            }
          }
        }

        return Response.json({
          isDesktop: desktop,
          activeFile: activePath ? basename(activePath) : null,
          activePath,
        });
      },
    },
    {
      pattern: new URLPattern({ pathname: "/api/editor/save" }),
      method: "POST",
      handler: async (req) => {
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
          await saveLastFile(activePath);
        }

        await writeTextFile(activePath, payload.content);
        return Response.json({
          ok: true,
          name: basename(activePath),
          path: activePath,
        });
      },
    },
    {
      pattern: new URLPattern({ pathname: "/api/editor/open" }),
      method: "POST",
      handler: async () => {
        const chosen = await chooseFile("open");
        if (!chosen) {
          return new Response(null, { status: 204 });
        }
        try {
          const content = await readTextFile(chosen);
          activePath = chosen;
          await saveLastFile(activePath);
          return Response.json({
            ok: true,
            name: basename(activePath),
            path: activePath,
            content,
          });
        } catch (error) {
          console.error("Failed to read manuscript:", error);
          return new Response("Failed to read file", { status: 500 });
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: "/api/editor/close" }),
      method: "POST",
      handler: async () => {
        activePath = null;
        restoredLastFile = true;
        await clearLastFile();
        return Response.json({ ok: true });
      },
    },
    {
      pattern: new URLPattern({ pathname: "/assets/*" }),
      method: "GET",
      handler: (req) => serveDir(req, { fsRoot: "./dist", quiet: true }),
    },
    {
      pattern: new URLPattern({ pathname: "/favicon.svg" }),
      method: "GET",
      handler: (req) => serveDir(req, { fsRoot: "./dist", quiet: true }),
    },
    {
      pattern: new URLPattern({ pathname: "/robots.txt" }),
      method: "GET",
      handler: (req) => serveDir(req, { fsRoot: "./dist", quiet: true }),
    },
  ];

  const handler = route(routes, () => new Response("Not Found", { status: 404 }));

  return Object.assign(handler, {
    fetch: handler,
    request(url: string | URL, init?: RequestInit): Promise<Response> {
      const full = url.toString().startsWith("http") ? url.toString() : `http://localhost${url}`;
      return Promise.resolve(handler(new Request(full, init)));
    },
  });
}
