import { textFromHtml } from "../../../lib/utilties/dom-utilities.ts";
import { htmlToMarkdown, markdownToHtml } from "../../../lib/utilties/markdown-utilities.ts";
import {
  createSlugFromString,
  getWordAndCharCountFromString,
} from "../../../lib/utilties/string-utilities.ts";
import type { Chapter, Manuscript } from "./types.ts";

export function blankManuscript(title = "Untitled Manuscript"): Manuscript {
  return {
    filename: `${slug(title) || "manuscript"}.md`,
    frontmatter: {
      title,
      author: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    chapters: [chapter("Chapter 1", "<p></p>")],
  };
}

export function chapter(title: string, content: string): Chapter {
  const stats = count(textFromHtml(content));
  return {
    id: crypto.randomUUID(),
    title,
    content,
    wordCount: stats.words,
    charCount: stats.chars,
  };
}

export function slug(value: string): string {
  return createSlugFromString(value);
}

export function count(text: string): { words: number; chars: number } {
  return getWordAndCharCountFromString(text);
}

export function parseManuscript(source: string, filename: string): Manuscript {
  let frontmatter: Record<string, string | number> = {
    title: filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    author: "",
    createdAt: new Date().toISOString(),
  };
  let body = source;
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (match?.[1] !== undefined && match[2] !== undefined) {
    body = match[2];
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        frontmatter = { ...frontmatter, ...parsed };
      }
    } catch {
      for (const line of match[1].split(/\r?\n/)) {
        const pair = line.match(/^([\w-]+):\s*(.+)$/);
        if (pair?.[1] && pair[2]) frontmatter[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
      }
    }
  }

  const chapters: Chapter[] = [];
  let title = "Chapter 1";
  let lines: string[] = [];
  const flush = () => {
    if (!lines.some((line) => line.trim()) && chapters.length) return;
    let markdown = lines.join("\n").trim();
    const heading = markdown.match(/^#\s+(.+)\r?\n?/);
    if (heading?.[1]?.trim() === title.trim()) markdown = markdown.slice(heading[0].length).trim();
    chapters.push(chapter(title, markdownToHtml(markdown)));
  };
  for (const line of body.split(/\r?\n/)) {
    const marker = line.trim().match(
      /^(?:<!--\s*chapter:?\s*(.*?)\s*-->|---chapter:?\s*(.*?)\s*---)$/i,
    );
    const heading = line.trim().match(/^#{1,2}\s+(chapter\b.*|prologue|epilogue|introduction)$/i);
    const markerTitle = marker?.[1] ?? marker?.[2] ?? heading?.[1];
    if (markerTitle !== undefined) {
      if (lines.some((part) => part.trim())) flush();
      title = markerTitle.trim() || `Chapter ${chapters.length + 1}`;
      lines = [];
    } else if (line.trim() || lines.length) {
      lines.push(line);
    }
  }
  flush();
  return {
    filename,
    frontmatter,
    chapters: chapters.length ? chapters : [chapter("Chapter 1", "")],
  };
}

export function serialize(manuscript: Manuscript): string {
  const metadata = {
    ...manuscript.frontmatter,
    updatedAt: new Date().toISOString(),
    totalChapters: manuscript.chapters.length,
    totalWords: manuscript.chapters.reduce((sum, item) => sum + item.wordCount, 0),
  };
  const chapters = manuscript.chapters.map((item) =>
    `<!-- chapter: ${item.title.replace(/-->/g, "")} -->\n\n${htmlToMarkdown(item.content)}`
  );
  return `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${chapters.join("\n\n")}\n`;
}

export const SAMPLE_NOVEL = `---
{"title":"The Lord of the Rings","author":"J.R.R. Tolkien"}
---

<!-- chapter: Chapter 1: A Long Expected Party -->

When Mr. Bilbo Baggins of Bag End announced that he would shortly be celebrating his eleventy-first birthday with a party of special magnificence, there was much talk and excitement in Hobbiton.
<!-- chapter: Chapter 2: The Shadow of the Past -->

The talk did not die down in nine or even ninety-nine days. The second disappearance of Mr. Bilbo Baggins was discussed in Hobbiton, and indeed all over the Shire, for a year and a day, and was remembered much longer than that. It became a fireside-story for young hobbits; and eventually Mad Baggins, who used to vanish with a bang and a flash and reappear with bags of jewels and gold, became a favourite character of legend and lived on long after all the true events were forgotten.


<!-- chapter: Chapter 3: Three Is Company -->

‘You ought to go quietly, and you ought to go soon,’ said Gandalf. Two or three weeks had passed, and still Frodo made no sign of getting ready to go.
`;
