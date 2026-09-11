import { element } from "../../../lib/utilties/dom-utilities.ts";
import type { EditorElements, Manuscript, WritableFileHandle } from "./types.ts";

export function render(
  manuscript: Manuscript,
  activeChapter: number,
  elements: EditorElements,
  onChapterSelect: (index: number) => void,
  onChapterDelete: (index: number) => void,
): void {
  const current = manuscript.chapters[activeChapter];
  if (!current) return;
  elements.manuscriptTitle.value = String(manuscript.frontmatter.title ?? "Untitled Manuscript");
  elements.chapterTitle.value = current.title;
  elements.editor.innerHTML = current.content || "<p></p>";
  element("#filename").textContent = manuscript.filename;
  element("#chapter-breadcrumb").textContent = current.title;
  elements.chapterList.replaceChildren(...manuscript.chapters.map((item, index) => {
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
      onChapterDelete(index);
    });
    row.append(label, words, remove);
    row.addEventListener("click", () => {
      if (index === activeChapter) return;
      onChapterSelect(index);
    });
    return row;
  }));
  updateStats(manuscript, activeChapter);
}

export function updateStats(manuscript: Manuscript, activeChapter: number): void {
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

export function updateStatus(
  saveStatus: HTMLElement,
  fileHandle: WritableFileHandle | null,
  canWrite: boolean,
): void {
  saveStatus.textContent = fileHandle && canWrite
    ? `Saved in app · syncing ${fileHandle.name}`
    : "Saved in app only";
}

export function updateChangedStatus(saveStatus: HTMLElement): void {
  saveStatus.textContent = "Unsaved changes";
}
