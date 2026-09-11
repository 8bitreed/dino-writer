import type { Manuscript, WritableFileHandle } from "./types.ts";

export const STORAGE_KEY = "writer-tools-manuscript-v1";
export const HANDLE_KEY = "active-file-handle";

export function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WriterToolsDB", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeHandle(value: WritableFileHandle | null): Promise<void> {
  try {
    const db = await database();
    const transaction = db.transaction("handles", "readwrite");
    if (value) transaction.objectStore("handles").put(value, HANDLE_KEY);
    else transaction.objectStore("handles").delete(HANDLE_KEY);
  } catch (error) {
    console.warn("Could not persist the file handle.", error);
  }
}

export async function restoreHandle(): Promise<WritableFileHandle | null> {
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

export function saveLocal(manuscript: Manuscript, activeChapter: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ manuscript, activeChapter }));
}

export function restoreLocal(): { manuscript: Manuscript; activeChapter: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved);
    if (state?.manuscript?.chapters?.length) {
      return {
        manuscript: state.manuscript,
        activeChapter: Math.min(
          Number(state.activeChapter) || 0,
          state.manuscript.chapters.length - 1,
        ),
      };
    }
  } catch (error) {
    console.warn("Could not restore the manuscript.", error);
  }
  return null;
}
