import type { Manuscript, WritableFileHandle } from "./types.ts";
import { blankManuscript, count } from "./data.ts";

export interface EditorState {
  manuscript: Manuscript;
  activeChapter: number;
  fileHandle: WritableFileHandle | null;
  canWrite: boolean;
  isDesktop: boolean;
  desktopFileLoaded: boolean;
  saveTimer: ReturnType<typeof setTimeout> | undefined;
}

export const state: EditorState = {
  manuscript: blankManuscript(),
  activeChapter: 0,
  fileHandle: null,
  canWrite: false,
  isDesktop: false,
  desktopFileLoaded: false,
  saveTimer: undefined,
};

export function syncChapter(editor: HTMLElement): void {
  const current = state.manuscript.chapters[state.activeChapter];
  if (!current) return;
  current.content = editor.innerHTML;
  const stats = count(editor.innerText);
  current.wordCount = stats.words;
  current.charCount = stats.chars;
}
