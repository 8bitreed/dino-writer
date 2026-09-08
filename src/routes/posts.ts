import { Hono } from "@hono/hono";
import { html, raw } from "@hono/hono/html";
import { listPosts, readPost, renderMarkdown } from "../lib/posts.ts";
import type { LayoutFunction } from "../views/layout.ts";

export function postRoutes(layout: LayoutFunction): Hono {
  return new Hono()
    .get("/", async (c) => {
      const posts = await listPosts();
      return c.html(layout(c, {
        title: "Latest Posts",
        body: html`
          <div class="stack">
            <header class="page-heading">
              <h1>Latest Posts</h1>
              <p>Writing notes, examples, and updates.</p>
            </header>
            <ul class="post-list">
              ${posts.map((post) =>
                html`
                  <li class="card">
                    <a href="/posts/${post.slug}">${post.title}</a>
                    ${post.excerpt ? html`<p>${post.excerpt}</p>` : ""}
                    <time datetime="${post.date}">${post.date}</time>
                  </li>
                `
              )}
            </ul>
          </div>
        `,
      }));
    })
    .get("/posts", (c) => c.redirect("/", 308))
    .get("/posts/:slug", async (c) => {
      const post = await readPost(c.req.param("slug"));
      if (!post) return c.notFound();
      return c.html(layout(c, {
        title: post.title,
        body: html`<article class="markdown prose">${raw(renderMarkdown(post.body))}</article>`,
      }));
    });
}
