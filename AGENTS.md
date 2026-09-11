# Copilot instructions

## Commands

This is a Deno 2 project; use Deno tasks and JSR imports rather than npm tooling.

- `deno task dev` builds assets, then serves the browser app at `http://localhost:8000` with
  server-side watch mode.
- `deno task dev:assets` watches and rebuilds browser TypeScript and CSS. Run it in a second
  terminal with `deno task dev` when changing client assets.
- `deno task build` creates content-hashed browser bundles and `dist/manifest.json`.
- `deno task start` serves an existing production build.
- `deno task desktop:dev` builds and runs the Deno Desktop app with HMR for server handler changes.
  Restart it after changing client TypeScript or CSS.
- `deno task desktop` builds the native application for the current platform into `desktop/`.
- `deno task check` runs formatting checks, linting, type checks, and the full test suite.

`dist/` is generated and gitignored, but application modules import `dist/manifest.json`. In a clean
checkout, run `deno task build` before `deno task check` or any test that imports `src/app.ts`.

Run tests directly with the same permissions used by the check task:

```sh
deno test --allow-read=dist,tests
deno test --allow-read=dist,tests tests/app_test.ts
deno test --allow-read=dist,tests --filter "renders editor" tests/app_test.ts
```

When granting permissions, specify the minimal `--allow-*` flags needed (e.g. `--allow-read=...`)
rather than defaulting to `-A`. Use `deno <subcommand> --help` to verify flags and
`deno doc <specifier>` to inspect library APIs directly in the terminal. Always check
`deno desktop --help` before searching the web when looking for how to use Deno Desktop or
troubleshooting Deno Desktop.

Source-only tests such as `tests/html_test.ts` and `tests/csrf_test.ts` do not require a prior asset
build. Formatting is configured for 100-column lines, semicolons, and double quotes.

## Architecture

Writasaurus is a local-first manuscript editor with one application core and two launch modes:

- `src/main.ts` is the normal HTTP entry point. `server.ts` is the Deno Desktop entry point and
  creates the native browser window through the side-effect import of `src/desktop.ts`.
- `src/app.ts` constructs the custom router, loads the asset manifest, installs global CSRF
  middleware, provides the shared route context (`asset`, `isDesktop`, and `json`), and registers
  all feature routes.
- `src/routes/routes.ts` is the route composition root. Feature routes must be registered before the
  final `/*` static-file route, which serves `dist/` and deliberately hides `/manifest.json`.
- Each feature under `src/features/` colocates route registration, server-rendered views, browser
  entry points, and CSS. Views use the shared layout; browser behavior is loaded as external modules
  from hashed asset URLs.
- `src/framework/` is the small application framework: routing wraps `@std/http/unstable-route`,
  HTML templates escape interpolated values, `createView` converts templates to CSP-protected
  responses, and the bundler builds browser assets.
- The editor client is split into a module-level state object plus focused action, persistence,
  file-I/O, component, serialization, and UI modules. Manuscripts are persisted in `localStorage`;
  browser file handles are persisted separately in IndexedDB.
- File access has two paths. In browsers, the File System Access API is preferred with upload and
  download fallbacks. In Desktop, `/api/editor/*` routes use native OS dialogs and Deno file APIs,
  and remember the last opened path in the platform application-data directory.
- Markdown files use JSON frontmatter and `<!-- chapter: ... -->` separators. Editor content is
  maintained as HTML in memory and converted at the Markdown import/export boundary.

## Repository conventions

- Add browser entry files under `src/features/` with a `.client.ts` or `.client.css` suffix.
  `build.ts` discovers them recursively; do not maintain a manual entry list.
- Resolve built assets in views with `ctx.asset("features/.../...client.ts")` using the path
  relative to `src/`. Never hard-code generated filenames from `dist/assets/`.
- Build HTML with the `html` tagged template and compose views with `createView` and `baseLayout`.
  Interpolated strings are escaped automatically. Use `raw()` only for content already known to be
  safe; nested `html` results are the normal way to insert markup.
- Keep scripts and styles external. HTML responses enforce a strict CSP that does not permit inline
  script or style content.
- Route modules mutate the supplied `Router` and return it. Register new feature route modules in
  `src/routes/routes.ts`; keep the static catch-all last.
- All unsafe HTTP methods must remain same-origin. Tests calling POST/PUT/DELETE routes through
  `app.request()` need an `Origin` header matching the request URL, normally
  `origin: "http://localhost"`.
- Test routes without starting a server by creating an app and using `app.request()`. Existing tests
  use small local assertion helpers rather than a separate assertion library.
- Preserve browser/Desktop parity when changing open, save, close, or restore behavior. Browser
  state uses `fileHandle`/`canWrite`; Desktop state uses `desktopFileLoaded` and the server-owned
  active path.
- Use explicit `.ts` extensions for local imports and the aliases in `deno.json` for standard
  library dependencies (`jsr:@std/...`). Do not use legacy URL imports (`https://deno.land/x/...`).
