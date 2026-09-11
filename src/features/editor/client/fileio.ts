import { element } from "../../../lib/utilties/dom-utilities.ts";
import type { Manuscript, WritableFileHandle } from "./types.ts";
import { serialize } from "./data.ts";
import { storeHandle } from "./storage.ts";
import { state, syncChapter } from "./state.ts";

const filePicker = globalThis as unknown as {
  showSaveFilePicker?: (options: object) => Promise<WritableFileHandle>;
  showOpenFilePicker?: (options: object) => Promise<WritableFileHandle[]>;
};

export async function hasWritePermission(
  handle: WritableFileHandle,
  request: boolean,
): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return request && (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function writeFile(
  handle: WritableFileHandle,
  manuscript: Manuscript,
  saveStatus: HTMLElement,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serialize(manuscript));
  await writable.close();
  saveStatus.textContent = `Saved to ${handle.name}`;
}

export function download(manuscript: Manuscript, saveStatus: HTMLElement): void {
  const url = URL.createObjectURL(new Blob([serialize(manuscript)], { type: "text/markdown" }));
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

export async function saveToDisk(
  editor: HTMLElement,
  saveStatus: HTMLElement,
  saveLocal: () => void,
  saveAs = false,
): Promise<void> {
  syncChapter(editor);
  if (state.isDesktop) {
    try {
      const response = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: serialize(state.manuscript),
          filename: state.manuscript.filename,
          saveAs: saveAs || !state.desktopFileLoaded,
        }),
      });
      if (response.status === 204) return;
      if (!response.ok) throw new Error(`Disk save failed: ${response.status}`);
      const result = await response.json();
      state.manuscript.filename = result.name;
      state.desktopFileLoaded = true;
      saveLocal();
      saveStatus.textContent = `Saved to ${result.name}`;
      element("#filename").textContent = result.name;
      return;
    } catch (error) {
      console.error("Desktop save failed:", error);
      saveStatus.textContent = "Saved in app only · disk save failed";
    }
  }

  if (state.fileHandle) {
    try {
      state.canWrite = await hasWritePermission(state.fileHandle, true);
      if (state.canWrite) {
        await writeFile(state.fileHandle, state.manuscript, saveStatus);
        saveLocal();
        return;
      }
    } catch (error) {
      console.warn("The previous file handle is no longer writable.", error);
      state.fileHandle = null;
      state.canWrite = false;
      await storeHandle(null);
    }
  }

  if (!filePicker.showSaveFilePicker) {
    download(state.manuscript, saveStatus);
    return;
  }

  try {
    const handle = await filePicker.showSaveFilePicker({
      suggestedName: state.manuscript.filename,
      types: [{
        description: "Markdown",
        accept: {
          "text/markdown": [".md", ".markdown"],
          "text/plain": [".txt"],
        },
      }],
    });
    state.fileHandle = handle;
    state.canWrite = true;
    state.manuscript.filename = handle.name;
    await storeHandle(handle);
    await writeFile(handle, state.manuscript, saveStatus);
    saveLocal();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Native save picker failed; using a download instead.", error);
    download(state.manuscript, saveStatus);
  }
}

export async function openFile(
  fileInput: HTMLInputElement,
  onLoaded: (file: File, handle: WritableFileHandle | null, writable: boolean) => Promise<void>,
): Promise<void> {
  if (state.isDesktop) {
    try {
      const response = await fetch("/api/editor/open", { method: "POST" });
      if (response.status === 204) return;
      if (!response.ok) throw new Error(`File open failed: ${response.status}`);
      const result = await response.json();
      const file = new File([result.content], result.name);
      state.desktopFileLoaded = true;
      await onLoaded(file, null, false);
      element("#save-status").textContent = `Opened ${result.name}`;
      return;
    } catch (error) {
      console.error("Desktop open failed:", error);
      alert("The manuscript could not be opened.");
      return;
    }
  }

  if (!filePicker.showOpenFilePicker) {
    fileInput.click();
    return;
  }

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
      await onLoaded(await handle.getFile(), handle, writable);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Native open picker failed; using the upload picker instead.", error);
    fileInput.click();
  }
}
