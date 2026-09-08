// @ts-check

const directory = "./posts";

/** @param {string} value */
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      /** @type {Record<string, string>} */ ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

/** @param {string} content */
function parse(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  /** @type {Record<string, string>} */
  const metadata = {};
  if (!match) return { metadata, body: content };
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (pair && pair[2]) metadata[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
  }
  return { metadata, body: match[2] };
}

/** @param {string} value */
function inline(value) {
  return escape(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** @param {string} source */
export function renderMarkdown(source) {
  const lines = source.trim().split(/\r?\n/);
  const output = [];
  /** @type {string[]} */
  let paragraph = [];
  let inList = false;
  const flush = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const item = line.match(/^-\s+(.+)$/);
    if (heading) {
      flush();
      if (inList) output.push("</ul>");
      inList = false;
      output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (item) {
      flush();
      if (!inList) output.push("<ul>");
      inList = true;
      output.push(`<li>${inline(item[1])}</li>`);
    } else if (line.startsWith("> ")) {
      flush();
      if (inList) output.push("</ul>");
      inList = false;
      output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else if (!line.trim()) {
      flush();
      if (inList) output.push("</ul>");
      inList = false;
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  if (inList) output.push("</ul>");
  return output.join("");
}

export async function listPosts() {
  const posts = [];
  for await (const entry of Deno.readDir(directory)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    const source = await Deno.readTextFile(`${directory}/${entry.name}`);
    const { metadata, body } = parse(source);
    const firstParagraph = body.split(/\n\s*\n/).find((part) => part && !part.startsWith("#"));
    posts.push({
      slug: entry.name,
      title: metadata.title ?? entry.name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""),
      date: metadata.date ?? entry.name.slice(0, 10),
      excerpt: metadata.excerpt ?? metadata.summary ?? firstParagraph?.replace(/\n/g, " ") ?? "",
    });
  }
  return posts.sort((left, right) => right.date.localeCompare(left.date));
}

/** @param {string} slug */
export async function readPost(slug) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/.test(slug)) return null;
  try {
    const { metadata, body } = parse(await Deno.readTextFile(`${directory}/${slug}`));
    return { title: metadata.title ?? slug.replace(/\.md$/, ""), body };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}
