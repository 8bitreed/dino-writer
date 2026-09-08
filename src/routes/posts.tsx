import { Hono } from "@hono/hono";
import { raw } from "@hono/hono/html";
import { listPosts, readPost, renderMarkdown } from "../lib/posts.ts";

export function postRoutes(_layout?: unknown): Hono {
  return new Hono()
    .get("/", async (c) => {
      const posts = await listPosts();
      return c.render(
        <div class="stack">
          <header class="page-heading">
            <h1>Latest Posts</h1>
            <p>Writing notes, examples, and updates.</p>
          </header>
          <ul class="post-list">
            {posts.map((post) => (
              <li key={post.slug} class="card">
                <a href={`/posts/${post.slug}`}>{post.title}</a>
                {post.excerpt ? <p>{post.excerpt}</p> : null}
                <time datetime={post.date}>{post.date}</time>
              </li>
            ))}
          </ul>
        </div>,
        { title: "Latest Posts" },
      );
    })
    .get("/posts", (c) => c.redirect("/", 308))
    .get("/posts/:slug", async (c) => {
      const post = await readPost(c.req.param("slug"));
      if (!post) return c.notFound();
      return c.render(
        <article class="markdown prose">{raw(renderMarkdown(post.body))}</article>,
        { title: post.title },
      );
    });
}
