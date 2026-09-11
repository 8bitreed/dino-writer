# Writer Tools

A local-first manuscript editor built with Deno standard library HTTP routing and safe HTML template
literals. Deno serves the application, bundles browser TypeScript and CSS, and Deno Desktop packages
it in a native webview.

## Run

```sh
deno task dev
```

Open <http://localhost:8000>. For live frontend rebuilds, run this in a second terminal:

```sh
deno task dev:assets
```

Production:

```sh
deno task build
deno task start
```

Desktop development:

```sh
deno task desktop:dev
```

This passes `server.ts` explicitly so Desktop uses plain Deno HMR. Restart the task after changing
client TypeScript or CSS; server handler edits use HMR.

Build the desktop application configured for the current platform:

```sh
deno task desktop
```

Desktop builds are written under `desktop/`. Deno Desktop selects a private loopback port, embeds
the bundled output, and opens the application in a native webview.

Check formatting, linting, TypeScript types, and tests:

```sh
deno task check
```

## Structure

- `src/app.ts` creates the router and shared application context.
- `src/features/` colocates each feature's routes, views, browser TypeScript, and CSS.
- `src/views/` contains shared HTML template literal layouts.
- `src/framework/` contains routing, safe HTML templates, and asset resolving helpers.
- `src/assets/` contains shared CSS and static files.
- `src/assets/static/` contains unchanged files copied directly to the root of `dist/`.

## Editor

The editor is the root route (`/`). It stores the active manuscript in localStorage, remembers
granted file handles in IndexedDB, and integrates with native desktop file dialogs or the File
System Access API when available. It supports multiple chapters, Markdown import/export,
drag-and-drop opening, direct saves, Ctrl/Cmd+S, a sample manuscript, and live word, page, and
character counts. Browsers without direct file access use normal uploads and downloads.

## Browser assets

`build.ts` contains an explicit `entries` list for browser TypeScript and CSS and passes it to the
reusable bundler in `src/framework/bundle/bundle.ts`. The bundler also handles Deno's `--watch`
argument. Add each new client entry to that list; client TypeScript uses the `[name].client.ts`
convention and can live beside its feature code. `deno task build` bundles each entry, writes a
content-hashed file to `dist/assets/`, and records its source-relative path in `dist/manifest.json`.

`src/framework/assets.ts` exposes `ctx.asset(path)`, which resolves a registered source path such as
`features/editor/editor.client.ts` to its built URL. Feature views create their own escaped
stylesheet and script tags and pass them through the base layout's `scripts` slot.

Files under `src/assets/static/` bypass bundling and hashing. For example,
`src/assets/static/robots.txt` is copied to `dist/robots.txt`.

## Secure defaults

Tagged template literal function `html` automatically escapes interpolated strings. All script and
style loading uses external files (no inline scripts), so the root route sends a strict
Content-Security-Policy (`script-src 'self'; style-src 'self'`) without needing a nonce. Desktop and
server tasks grant only the network, environment, and file permissions needed by the application.
