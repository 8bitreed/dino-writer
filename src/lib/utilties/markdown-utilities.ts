/**
 * Escapes HTML special characters in a string to prevent XSS attacks. Look at dom-utilties for general purpose use of this function.
 */
function escapeHtml(value: string): string {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

/**
 * Converts a string with inline markdown syntax (like **bold** and *italic*) into HTML.
 * It escapes HTML special characters to prevent XSS attacks.
 */
export function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

/**
 * Converts a string with block-level markdown syntax (like headings, blockquotes, and lists) into HTML.
 * It uses the `inlineMarkdown` function to handle inline formatting within the blocks.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "<p></p>";
  return markdown.split(/\r?\n\r?\n/).map((part) => {
    const value = part.trim();
    if (value.startsWith("### ")) return `<h3>${inlineMarkdown(value.slice(4))}</h3>`;
    if (value.startsWith("## ")) return `<h2>${inlineMarkdown(value.slice(3))}</h2>`;
    if (value.startsWith("# ")) return `<h1>${inlineMarkdown(value.slice(2))}</h1>`;
    if (value.startsWith("> ")) return `<blockquote>${inlineMarkdown(value.slice(2))}</blockquote>`;
    const lines = value.split(/\r?\n/);
    if (lines.every((line) => line.startsWith("- "))) {
      return `<ul>${
        lines.map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join("")
      }</ul>`;
    }
    return `<p>${inlineMarkdown(value).replace(/\r?\n/g, "<br>")}</p>`;
  }).join("");
}

/**
 * Converts a DOM Node (like an HTMLElement or Text node) into a markdown string.
 * It recursively processes child nodes and applies markdown formatting based on the node type.
 */
function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const content = [...node.childNodes].map(nodeToMarkdown).join("");
  if (node.matches("strong,b")) return `**${content}**`;
  if (node.matches("em,i")) return `*${content}*`;
  if (node.matches("br")) return "\n";
  if (node.matches("h1")) return `# ${content}\n\n`;
  if (node.matches("h2")) return `## ${content}\n\n`;
  if (node.matches("h3")) return `### ${content}\n\n`;
  if (node.matches("blockquote")) return `> ${content}\n\n`;
  if (node.matches("li")) return `- ${content}\n`;
  if (node.matches("ul")) return `${content}\n`;
  if (node.matches("p,div")) return `${content}\n\n`;
  return content;
}

/**
 * Converts HTML content into a markdown string.
 * It creates a temporary DOM element to parse the HTML and then uses `nodeToMarkdown` to convert it.
 */
export function htmlToMarkdown(html: string): string {
  const node = document.createElement("div");
  node.innerHTML = html;
  return [...node.childNodes].map(nodeToMarkdown).join("").trim();
}
