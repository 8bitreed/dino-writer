import { element, textFromHtml } from "../../lib/utilties/dom-utilities.ts";
import { htmlToMarkdown, markdownToHtml } from "../../lib/utilties/markdown-utilities.ts";
import {
  createSlugFromString,
  getWordAndCharCountFromString,
} from "../../lib/utilties/string-utilities.ts";

const STORAGE_KEY = "writer-tools-manuscript-v1";
const HANDLE_KEY = "active-file-handle";

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  charCount: number;
}

export interface Manuscript {
  filename: string;
  frontmatter: Record<string, string | number>;
  chapters: Chapter[];
}

export interface WritableFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  queryPermission(options: { mode: string }): Promise<string>;
  requestPermission(options: { mode: string }): Promise<string>;
}

const filePicker = globalThis as unknown as {
  showSaveFilePicker?: (options: object) => Promise<WritableFileHandle>;
  showOpenFilePicker?: (options: object) => Promise<WritableFileHandle[]>;
};

const editor = element("#editor");
const chapterList = element("#chapter-list");
const sidebar = element("#editor-sidebar");
const chapterTitle = element<HTMLInputElement>("#chapter-title");
const manuscriptTitle = element<HTMLInputElement>("#manuscript-title");
const fileInput = element<HTMLInputElement>("#file-input");
const modal = element("#welcome-modal");
const saveStatus = element("#save-status");
let activeChapter = 0;
let fileHandle: WritableFileHandle | null = null;
let canWrite = false;
let isDesktop = false;
let desktopFileLoaded = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let manuscript: Manuscript = blankManuscript();

function blankManuscript(title = "Untitled Manuscript"): Manuscript {
  return {
    filename: `${slug(title) || "manuscript"}.md`,
    frontmatter: {
      title,
      author: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    chapters: [chapter("Chapter 1: The Beginning", "<p></p>")],
  };
}

function chapter(title: string, content: string): Chapter {
  const stats = count(textFromHtml(content));
  return {
    id: crypto.randomUUID(),
    title,
    content,
    wordCount: stats.words,
    charCount: stats.chars,
  };
}

function slug(value: string): string {
  return createSlugFromString(value);
}

function count(text: string): { words: number; chars: number } {
  return getWordAndCharCountFromString(text);
}

function parseManuscript(source: string, filename: string): Manuscript {
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

function syncChapter(): void {
  const current = manuscript.chapters[activeChapter];
  if (!current) return;
  current.content = editor.innerHTML;
  const stats = count(editor.innerText);
  current.wordCount = stats.words;
  current.charCount = stats.chars;
}

function serialize(): string {
  syncChapter();
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

function render(): void {
  const current = manuscript.chapters[activeChapter];
  if (!current) return;
  manuscriptTitle.value = String(manuscript.frontmatter.title ?? "Untitled Manuscript");
  chapterTitle.value = current.title;
  editor.innerHTML = current.content || "<p></p>";
  element("#filename").textContent = manuscript.filename;
  element("#chapter-breadcrumb").textContent = current.title;
  chapterList.replaceChildren(...manuscript.chapters.map((item, index) => {
    const row = document.createElement("li");
    row.className = `chapter-item${index === activeChapter ? " active" : ""}`;
    const label = document.createElement("span");
    label.textContent = item.title;
    const words = document.createElement("small");
    words.textContent = `${item.wordCount.toLocaleString()}w`;
    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.ariaLabel = `Delete ${item.title}`;
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      if (manuscript.chapters.length === 1) return alert("A manuscript needs one chapter.");
      if (!confirm(`Delete "${item.title}"?`)) return;
      syncChapter();
      manuscript.chapters.splice(index, 1);
      if (index < activeChapter) activeChapter--;
      else if (index === activeChapter) {
        activeChapter = Math.min(activeChapter, manuscript.chapters.length - 1);
      }
      render();
      saveLocal();
    });
    row.append(label, words, remove);
    row.addEventListener("click", () => {
      if (index === activeChapter) return;
      syncChapter();
      activeChapter = index;
      render();
      saveLocal();
      if (matchMedia("(max-width: 55rem)").matches) sidebar.classList.add("collapsed");
    });
    return row;
  }));
  updateStats();
}

function updateStats(): void {
  const current = manuscript.chapters[activeChapter];
  const total = manuscript.chapters.reduce((sum, item) => sum + item.wordCount, 0);
  element("#chapter-stats").textContent = `Chapter: ${current?.wordCount ?? 0} words · ${
    current?.charCount ?? 0
  } characters`;
  element("#total-stats").textContent = `Manuscript: ${total.toLocaleString()} words · ${
    (total / 300).toFixed(1)
  } pages`;
  element("#sidebar-stats").textContent = `${manuscript.chapters.length} chapter${
    manuscript.chapters.length === 1 ? "" : "s"
  }`;
}

function saveLocal(): void {
  syncChapter();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ manuscript, activeChapter }));
  saveStatus.textContent = fileHandle && canWrite
    ? `Saved in app · syncing ${fileHandle.name}`
    : "Saved in app only";
}

function changed(): void {
  syncChapter();
  saveStatus.textContent = "Unsaved changes";
  updateStats();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveLocal();
    if (isDesktop && desktopFileLoaded) {
      void fetch("/api/editor/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: serialize(),
          filename: manuscript.filename,
          saveAs: false,
        }),
      }).then(async (res) => {
        if (res.ok) {
          const result = await res.json();
          saveStatus.textContent = `Saved to ${result.name}`;
        }
      }).catch((error) => {
        console.error("Automatic disk save failed.", error);
        saveStatus.textContent = "Saved in app only · disk save failed";
      });
    } else if (fileHandle && canWrite) {
      void writeFile(fileHandle).catch((error) => {
        canWrite = false;
        console.error("Automatic disk save failed.", error);
        saveStatus.textContent = "Saved in app only · disk save failed";
      });
    }
  }, 500);
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WriterToolsDB", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(value: WritableFileHandle | null): Promise<void> {
  try {
    const db = await database();
    const transaction = db.transaction("handles", "readwrite");
    if (value) transaction.objectStore("handles").put(value, HANDLE_KEY);
    else transaction.objectStore("handles").delete(HANDLE_KEY);
  } catch (error) {
    console.warn("Could not persist the file handle.", error);
  }
}

async function restoreHandle(): Promise<WritableFileHandle | null> {
  try {
    const db = await database();
    return await new Promise((resolve, reject) => {
      const request = db.transaction("handles").objectStore("handles").get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Could not restore the file handle.", error);
    return null;
  }
}

async function writeFile(handle: WritableFileHandle): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serialize());
  await writable.close();
  saveLocal();
  saveStatus.textContent = `Saved to ${handle.name}`;
}

async function hasWritePermission(handle: WritableFileHandle, request: boolean): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return request && (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

async function saveToDisk(saveAs = false): Promise<void> {
  if (isDesktop) {
    try {
      const response = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: serialize(),
          filename: manuscript.filename,
          saveAs: saveAs || !desktopFileLoaded,
        }),
      });
      if (response.status === 204) return;
      if (!response.ok) throw new Error(`Disk save failed: ${response.status}`);
      const result = await response.json();
      manuscript.filename = result.name;
      desktopFileLoaded = true;
      saveLocal();
      saveStatus.textContent = `Saved to ${result.name}`;
      element("#filename").textContent = result.name;
      return;
    } catch (error) {
      console.error("Desktop save failed:", error);
      saveStatus.textContent = "Saved in app only · disk save failed";
    }
  }

  if (fileHandle) {
    try {
      canWrite = await hasWritePermission(fileHandle, true);
      if (canWrite) return await writeFile(fileHandle);
    } catch (error) {
      console.warn("The previous file handle is no longer writable.", error);
      fileHandle = null;
      canWrite = false;
      await storeHandle(null);
    }
  }

  if (!filePicker.showSaveFilePicker) return download();
  try {
    fileHandle = await filePicker.showSaveFilePicker({
      suggestedName: manuscript.filename,
      types: [{
        description: "Markdown",
        accept: {
          "text/markdown": [".md", ".markdown"],
          "text/plain": [".txt"],
        },
      }],
    });
    canWrite = true;
    manuscript.filename = fileHandle.name;
    await storeHandle(fileHandle);
    await writeFile(fileHandle);
    render();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Native save picker failed; using a download instead.", error);
    download();
  }
}

function download(): void {
  const url = URL.createObjectURL(new Blob([serialize()], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = manuscript.filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  saveStatus.textContent = `Exported ${manuscript.filename}`;
}

async function loadFile(
  file: File,
  handle: WritableFileHandle | null = null,
  writable = false,
): Promise<void> {
  manuscript = parseManuscript(await file.text(), file.name);
  activeChapter = 0;
  fileHandle = handle;
  canWrite = writable;
  await storeHandle(handle);
  render();
  saveLocal();
  modal.classList.add("hidden");
}

async function openFile(): Promise<void> {
  if (isDesktop) {
    try {
      const response = await fetch("/api/editor/open", { method: "POST" });
      if (response.status === 204) return;
      if (!response.ok) throw new Error(`File open failed: ${response.status}`);
      const result = await response.json();
      manuscript = parseManuscript(result.content, result.name);
      activeChapter = 0;
      fileHandle = null;
      canWrite = false;
      desktopFileLoaded = true;
      render();
      saveLocal();
      saveStatus.textContent = `Opened ${result.name}`;
      modal.classList.add("hidden");
      return;
    } catch (error) {
      console.error("Desktop open failed:", error);
      alert("The manuscript could not be opened.");
      return;
    }
  }

  if (!filePicker.showOpenFilePicker) return fileInput.click();
  try {
    const handles = await filePicker.showOpenFilePicker({
      types: [{
        description: "Markdown",
        accept: {
          "text/markdown": [".md", ".markdown"],
          "text/plain": [".txt"],
        },
      }],
      multiple: false,
    });
    const handle = handles[0];
    if (handle) {
      const writable = await hasWritePermission(handle, true);
      await loadFile(await handle.getFile(), handle, writable);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Native open picker failed; using the upload picker instead.", error);
    fileInput.click();
  }
}

function newManuscript(): void {
  const title = prompt("Manuscript title:", "My Novel")?.trim() || "Untitled Manuscript";
  manuscript = blankManuscript(title);
  activeChapter = 0;
  fileHandle = null;
  canWrite = false;
  desktopFileLoaded = false;
  if (isDesktop) void fetch("/api/editor/close", { method: "POST" });
  void storeHandle(null);
  render();
  saveLocal();
  modal.classList.add("hidden");
}

function loadSample(): void {
  manuscript = parseManuscript(
    `---
{"title":"The Chronicler's Compass","author":"Writer Tools"}
---

<!-- chapter: Chapter 1: The Dust of Alexandria -->

The library did not burn in a single cataclysm of flame. It eroded slowly, piece by precious piece.

<!-- chapter: Chapter 2: The Northern Passage -->

Three weeks into the voyage across the Aegean, the winds turned merciless.

<!-- chapter: Chapter 3: The Hidden Vault -->

Beneath the monastery foundations, a single copper key clicked into place.
`,
    "the-chroniclers-compass.md",
  );
  activeChapter = 0;
  fileHandle = null;
  canWrite = false;
  desktopFileLoaded = false;
  if (isDesktop) void fetch("/api/editor/close", { method: "POST" });
  void storeHandle(null);
  render();
  saveLocal();
  modal.classList.add("hidden");
}

editor.addEventListener("input", changed);
editor.addEventListener("paste", (event) => {
  event.preventDefault();
  document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? "");
});
editor.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  // A raw tab character collapses to a single space under normal CSS
  // whitespace rules, so insert non-breaking spaces to render a visible indent.
  document.execCommand("insertText", false, "\u00A0\u00A0\u00A0\u00A0");
});
manuscriptTitle.addEventListener("input", () => {
  manuscript.frontmatter.title = manuscriptTitle.value.trim() || "Untitled Manuscript";
  changed();
});
chapterTitle.addEventListener("input", () => {
  const current = manuscript.chapters[activeChapter];
  if (!current) return;
  current.title = chapterTitle.value.trim() || `Chapter ${activeChapter + 1}`;
  element("#chapter-breadcrumb").textContent = current.title;
  changed();
});
element("#add-chapter").addEventListener("click", () => {
  syncChapter();
  manuscript.chapters.push(
    chapter(`Chapter ${manuscript.chapters.length + 1}: Untitled`, "<p></p>"),
  );
  activeChapter = manuscript.chapters.length - 1;
  render();
  saveLocal();
  chapterTitle.select();
});
element("#sidebar-toggle").addEventListener(
  "click",
  () => sidebar.classList.toggle("collapsed"),
);
element("#save-file").addEventListener("click", () => void saveToDisk());
element("#open-file").addEventListener("click", () => void openFile());
element("#new-file").addEventListener("click", newManuscript);
element("#export-file").addEventListener("click", download);
element("#modal-open").addEventListener("click", () => void openFile());
element("#modal-new").addEventListener("click", newManuscript);
element("#modal-sample").addEventListener("click", loadSample);
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void loadFile(file);
  fileInput.value = "";
});
for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", () => {
    if (!(button instanceof HTMLElement)) return;
    document.execCommand(button.dataset.command ?? "", false, button.dataset.value);
    editor.focus();
    changed();
  });
}
globalThis.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void saveToDisk();
  }
});
globalThis.addEventListener("dragover", (event) => event.preventDefault());
globalThis.addEventListener("drop", (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file && /\.(?:md|markdown|txt)$/i.test(file.name)) void loadFile(file);
});

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const state = JSON.parse(saved);
    if (state?.manuscript?.chapters?.length) {
      manuscript = state.manuscript;
      activeChapter = Math.min(Number(state.activeChapter) || 0, manuscript.chapters.length - 1);
      modal.classList.add("hidden");
    }
  }
} catch (error) {
  console.warn("Could not restore the manuscript.", error);
}
fileHandle = await restoreHandle();
if (fileHandle) {
  try {
    canWrite = await hasWritePermission(fileHandle, false);
  } catch (error) {
    console.warn("The stored file handle is no longer available.", error);
    fileHandle = null;
    canWrite = false;
    await storeHandle(null);
  }
}

try {
  const response = await fetch("/api/editor/status");
  if (response.ok) {
    const status = await response.json();
    isDesktop = status.isDesktop === true;
    desktopFileLoaded = typeof status.activeFile === "string";
    if (desktopFileLoaded && typeof status.content === "string" && status.activeFile) {
      manuscript = parseManuscript(status.content, status.activeFile);
      activeChapter = 0;
      fileHandle = null;
      canWrite = false;
      saveStatus.textContent = `Active file: ${status.activeFile}`;
      modal.classList.add("hidden");
      saveLocal();
    } else if (desktopFileLoaded && status.activeFile) {
      manuscript.filename = status.activeFile;
      element("#filename").textContent = status.activeFile;
      saveStatus.textContent = `Active file: ${status.activeFile}`;
    }
  }
} catch {
  isDesktop = false;
}

if (matchMedia("(max-width: 55rem)").matches) sidebar.classList.add("collapsed");
render();
