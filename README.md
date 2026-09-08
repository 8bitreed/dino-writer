# Writer Tools

A local-first manuscript editor, name generator, and Markdown publication reader built as a small
Hono MPA. Deno serves the application, bundles browser JavaScript and CSS, and Deno Desktop packages
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
the bundled output and Markdown posts, and opens the Hono application in a native webview.

Check formatting, linting, TypeScript types, and tests:

```sh
deno task check
```

## Structure

- `src/app.ts` configures middleware and mounts feature route modules.
- `src/routes/` contains independent Hono sub-apps mounted with `app.route()`.
- `src/views/` contains Hono `html` literal layouts.
- `src/lib/` contains only small application-specific helpers.
- `src/client/` contains browser-only vanilla TypeScript and CSS bundled by Deno.
- `src/client/static/` contains unchanged files copied directly to the root of `dist/`.
- `src/posts/` contains filesystem-backed Markdown posts.

## Editor

The editor stores the active manuscript in localStorage, remembers granted file handles in
IndexedDB, and uses the File System Access API when available. It supports multiple chapters,
Markdown import/export, drag-and-drop opening, direct saves, Ctrl/Cmd+S, a sample manuscript, and
live word, page, and character counts. Browsers without direct file access use normal uploads and
downloads.

## Browser assets

`build.ts` automatically registers every TypeScript file under `src/client/pages/` alongside
`src/client/app.ts`. `deno task build` writes content-hashed files to `dist/assets/` and records
them in `dist/manifest.json`.

`src/lib/assets.ts` exposes an `asset()` helper that resolves source names to their hashed scripts
and imported styles. The layout calls it automatically, always includes `app.js`, and accepts
optional page scripts by name:

```ts
layout(c, {
  title: "About",
  scripts: ["about.js"],
  body: html`<h1>About</h1>`,
});
```

Adding `src/client/pages/contact.ts` automatically registers it with the bundle step.
`asset("contact.js")` returns its hashed URL and any CSS imported by that entry. Hono serves the
generated `/assets/*` files.

Files under `src/client/static/` bypass bundling and hashing. For example,
`src/client/static/robots.txt` is copied to `dist/robots.txt`.

Add a feature by exporting a Hono sub-app:

```js
import { Hono } from "@hono/hono";
import { html } from "@hono/hono/html";

export const docsRoutes = new Hono()
  .get("/docs", (c) => c.html(html`<h1>Docs</h1>`));
```

Mount it with `app.route("/", docsRoutes)`.

## Secure defaults

Hono HTML literals escape interpolated values. The Markdown renderer escapes source content before
adding its supported formatting. Middleware provides a nonce-based CSP, secure headers, ETags,
static-file containment, and correct method handling. Desktop and server tasks grant only the
network, environment, and read permissions needed by the application.
