import type { Context } from "@hono/hono";
import type { Child, FC, PropsWithChildren } from "@hono/hono/jsx";
import { jsxRenderer } from "@hono/hono/jsx-renderer";
import type { AssetResolver } from "../lib/assets.ts";

export interface LayoutProps {
  title?: string;
  scripts?: string[];
  bodyClass?: string;
  mainClass?: string;
  header?: Child;
  footer?: Child;
}

declare module "@hono/hono" {
  interface ContextRenderer {
    (
      content: string | Promise<string> | Child | Promise<Child>,
      props?: LayoutProps,
    ): Response | Promise<Response>;
  }
}

export const DefaultHeader: FC = () => (
  <header class="site-header">
    <a class="brand" href="/">Writer Tools</a>
    <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
      Menu
    </button>
    <nav class="site-nav" id="site-nav">
      <a href="/">Posts</a>
      <a href="/name-gen">Name Generator</a>
      <a href="/editor">Editor</a>
      <a href="/about">About</a>
    </nav>
    <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">
      Theme
    </button>
  </header>
);

export const DefaultFooter: FC = () => (
  <footer class="site-footer">
    <span>&copy; {new Date().getFullYear()} Writer Tools</span>
    <a href="/about">About</a>
  </footer>
);

export interface FullLayoutProps extends LayoutProps {
  nonce?: string;
  asset: AssetResolver;
}

export const Layout: FC<PropsWithChildren<FullLayoutProps>> = ({
  children,
  title = "Writer Tools",
  scripts = [],
  bodyClass = "",
  mainClass = "page",
  header,
  footer,
  nonce,
  asset,
}) => {
  const entries = ["app.js", ...scripts].map(asset);
  const styles = [...new Set(entries.flatMap((entry) => entry.styles))];

  return (
    <html lang="en" data-theme="auto">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#f7f4ef" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <title>{title}</title>
        {styles.map((href) => <link key={href} rel="stylesheet" href={href} />)}
        {entries.map((entry) => (
          <script key={entry.script} type="module" src={entry.script} nonce={nonce} />
        ))}
      </head>
      <body class={bodyClass}>
        {header ?? <DefaultHeader />}
        <main class={mainClass}>{children}</main>
        {footer ?? <DefaultFooter />}
      </body>
    </html>
  );
};

export function createLayoutRenderer(asset: AssetResolver) {
  return jsxRenderer(
    ({ children, ...props }, c: Context) => (
      <Layout
        {...props}
        nonce={c.get("secureHeadersNonce")}
        asset={asset}
      >
        {children}
      </Layout>
    ),
    { docType: "<!doctype html>" },
  );
}

export const createLayout = createLayoutRenderer;
