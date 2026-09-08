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

- `src/app.ts` defines all HTTP routes using `@std/http/unstable-route`, the editor template, and
  desktop editor API handlers.
- `src/views/` contains the HTML template literal layout shell.
- `src/lib/` contains HTML escaping (`html.ts`) and asset resolving helpers.
- `src/client/` contains browser-only vanilla TypeScript and CSS bundled by Deno.
- `src/client/static/` contains unchanged files copied directly to the root of `dist/`.

## Editor

The editor is the root route (`/`). It stores the active manuscript in localStorage, remembers
granted file handles in IndexedDB, and integrates with native desktop file dialogs or the File
System Access API when available. It supports multiple chapters, Markdown import/export,
drag-and-drop opening, direct saves, Ctrl/Cmd+S, a sample manuscript, and live word, page, and
character counts. Browsers without direct file access use normal uploads and downloads.

## Browser assets

`build.ts` bundles the editor client code (`src/client/pages/editor.ts`) and styles
(`src/client/pages/editor.css`). `deno task build` writes content-hashed files to `dist/assets/` and
records them in `dist/manifest.json`.

`src/lib/assets.ts` exposes an `asset()` helper that resolves asset names to their hashed script and
styles. The layout calls it to inject the stylesheet and module script with CSP nonces.

Files under `src/client/static/` bypass bundling and hashing. For example,
`src/client/static/robots.txt` is copied to `dist/robots.txt`.

## Secure defaults

Tagged template literal function `html` automatically escapes interpolated strings. Middleware
provides a nonce-based CSP, secure headers, static-file containment, and method handling. Desktop
and server tasks grant only the network, environment, and file permissions needed by the
application.
