import type { WritableFileHandle } from "./types.ts";
import { blankManuscript, chapter, parseManuscript } from "./data.ts";
import { storeHandle } from "./storage.ts";
import { state, syncChapter } from "./state.ts";

export interface ActionCallbacks {
  render: () => void;
  saveLocal: () => void;
  modal: HTMLElement;
}

export async function loadFile(
  file: File,
  handle: WritableFileHandle | null = null,
  writable = false,
  callbacks?: ActionCallbacks,
): Promise<void> {
  state.manuscript = parseManuscript(await file.text(), file.name);
  state.activeChapter = 0;
  state.fileHandle = handle;
  state.canWrite = writable;
  await storeHandle(handle);
  if (callbacks) {
    callbacks.render();
    callbacks.saveLocal();
    callbacks.modal.classList.add("hidden");
  }
}

export function newManuscript(callbacks: ActionCallbacks): void {
  const title = prompt("Manuscript title:", "My Novel")?.trim() || "Untitled Manuscript";
  state.manuscript = blankManuscript(title);
  state.activeChapter = 0;
  state.fileHandle = null;
  state.canWrite = false;
  state.desktopFileLoaded = false;
  if (state.isDesktop) void fetch("/api/editor/close", { method: "POST" });
  void storeHandle(null);
  callbacks.render();
  callbacks.saveLocal();
  callbacks.modal.classList.add("hidden");
}

export function loadSample(callbacks: ActionCallbacks): void {
  state.manuscript = parseManuscript(
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
  state.activeChapter = 0;
  state.fileHandle = null;
  state.canWrite = false;
  state.desktopFileLoaded = false;
  if (state.isDesktop) void fetch("/api/editor/close", { method: "POST" });
  void storeHandle(null);
  callbacks.render();
  callbacks.saveLocal();
  callbacks.modal.classList.add("hidden");
}

export function addChapter(
  editor: HTMLElement,
  chapterTitle: HTMLInputElement,
  callbacks: ActionCallbacks,
): void {
  syncChapter(editor);
  state.manuscript.chapters.push(
    chapter(`Chapter ${state.manuscript.chapters.length + 1}: Untitled`, "<p></p>"),
  );
  state.activeChapter = state.manuscript.chapters.length - 1;
  callbacks.render();
  callbacks.saveLocal();
  chapterTitle.select();
}

export function deleteChapter(
  index: number,
  editor: HTMLElement,
  callbacks: ActionCallbacks,
): void {
  if (state.manuscript.chapters.length === 1) {
    alert("A manuscript needs one chapter.");
    return;
  }
  const item = state.manuscript.chapters[index];
  if (!confirm(`Delete "${item?.title}"?`)) return;
  syncChapter(editor);
  state.manuscript.chapters.splice(index, 1);
  if (index < state.activeChapter) {
    state.activeChapter--;
  } else if (index === state.activeChapter) {
    state.activeChapter = Math.min(state.activeChapter, state.manuscript.chapters.length - 1);
  }
  callbacks.render();
  callbacks.saveLocal();
}

export function selectChapter(
  index: number,
  editor: HTMLElement,
  sidebar: HTMLElement,
  callbacks: ActionCallbacks,
): void {
  if (index === state.activeChapter) return;
  syncChapter(editor);
  state.activeChapter = index;
  callbacks.render();
  callbacks.saveLocal();
  if (matchMedia("(max-width: 55rem)").matches) sidebar.classList.add("collapsed");
}
