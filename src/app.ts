import { serveDir } from "@std/http/file-server";
import { type Route, route } from "@std/http/unstable-route";
import { basename } from "@std/path";
import { type AssetResolver, loadAssets } from "./lib/assets.ts";
import { editorView } from "./views/pages/editor-view.ts";

export interface EditorApiOptions {
  isDesktop?: () => Promise<boolean> | boolean;
  chooseFile?: (action: "open" | "save", suggestedName?: string) => Promise<string | null>;
  readTextFile?: (path: string) => Promise<string>;
  writeTextFile?: (path: string, content: string) => Promise<void>;
}

export interface AppOptions {
  asset?: AssetResolver;
  editorApiOptions?: EditorApiOptions;
}

export type App = ((req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>) & {
  fetch(req: Request, info?: Deno.ServeHandlerInfo): Response | Promise<Response>;
  request(url: string | URL, init?: RequestInit): Promise<Response>;
};

function dialogCommand(): string {
  if (Deno.build.os === "linux") return "zenity";
  if (Deno.build.os === "darwin") return "osascript";
  return "powershell";
}

export async function defaultChooseFile(
  action: "open" | "save",
  suggestedName = "manuscript.md",
): Promise<string | null> {
  const command = dialogCommand();
  const perm = await Deno.permissions.query({ name: "run", command });
  if (perm.state !== "granted") return null;

  let args: string[];
  if (Deno.build.os === "linux") {
    args = [
      "--file-selection",
      `--title=${action === "open" ? "Open" : "Save"} Manuscript`,
      "--file-filter=Markdown files | *.md *.markdown *.txt",
      ...(action === "save"
        ? ["--save", "--confirm-overwrite", `--filename=${suggestedName}`]
        : []),
    ];
  } else if (Deno.build.os === "darwin") {
    const script = action === "open"
      ? 'POSIX path of (choose file with prompt "Open Manuscript")'
      : `POSIX path of (choose file name with prompt "Save Manuscript" default name "${
        suggestedName.replaceAll('"', "")
      }")`;
    args = ["-e", script];
  } else {
    const dialog = action === "open" ? "OpenFileDialog" : "SaveFileDialog";
    args = [
      "-NoProfile",
      "-Command",
      `Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.${dialog}; ` +
      `$d.Filter='Markdown (*.md;*.markdown;*.txt)|*.md;*.markdown;*.txt'; ` +
      `$d.FileName='${suggestedName.replaceAll("'", "")}'; ` +
      `if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.FileName)}`,
    ];
  }

  try {
    const output = await new Deno.Command(command, {
      args,
      stdout: "piped",
      stderr: "null",
    }).output();
    if (!output.success) return null;
    return new TextDecoder().decode(output.stdout).trim() || null;
  } catch {
    return null;
  }
}

export async function defaultIsDesktop(): Promise<boolean> {
  try {
    if (Deno.env.get("DENO_SERVE_ADDRESS") || Deno.env.get("DENO_DESKTOP")) {
      return true;
    }
    const runPerm = await Deno.permissions.query({ name: "run", command: dialogCommand() });
    const writePerm = await Deno.permissions.query({ name: "write" });
    return runPerm.state === "granted" && writePerm.state === "granted";
  } catch {
    return false;
  }
}

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

  let activePath: string | null = null;

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
      handler: async () =>
        Response.json({
          isDesktop: await isDesktop(),
          activeFile: activePath ? basename(activePath) : null,
          activePath,
        }),
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
      handler: () => {
        activePath = null;
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
