import { element } from "../../lib/utilties/dom-utilities.ts";
import type { EditorElements } from "./client/types.ts";
import { parseManuscript, serialize } from "./client/data.ts";
import { state, syncChapter } from "./client/state.ts";
import {
  restoreHandle,
  restoreLocal,
  saveLocal as saveLocalStorage,
  storeHandle,
} from "./client/storage.ts";
import { render as renderUi, updateChangedStatus, updateStats, updateStatus } from "./client/ui.ts";
import {
  download,
  hasWritePermission,
  openFile as openFileDialog,
  saveToDisk,
  writeFile,
} from "./client/fileio.ts";
import {
  type ActionCallbacks,
  addChapter,
  deleteChapter,
  loadFile,
  loadSample,
  newManuscript,
  selectChapter,
} from "./client/actions.ts";

const elements: EditorElements = {
  editor: element("#editor"),
  chapterList: element("#chapter-list"),
  sidebar: element("#editor-sidebar"),
  chapterTitle: element<HTMLInputElement>("#chapter-title"),
  manuscriptTitle: element<HTMLInputElement>("#manuscript-title"),
  fileInput: element<HTMLInputElement>("#file-input"),
  modal: element("#welcome-modal"),
  saveStatus: element("#save-status"),
};

function saveLocal(): void {
  syncChapter(elements.editor);
  saveLocalStorage(state.manuscript, state.activeChapter);
  updateStatus(elements.saveStatus, state.fileHandle, state.canWrite);
}

function render(): void {
  renderUi(
    state.manuscript,
    state.activeChapter,
    elements,
    (index) => selectChapter(index, elements.editor, elements.sidebar, actionCallbacks),
    (index) => deleteChapter(index, elements.editor, actionCallbacks),
  );
}

const actionCallbacks: ActionCallbacks = {
  render,
  saveLocal,
  modal: elements.modal,
};

function changed(): void {
  syncChapter(elements.editor);
  updateChangedStatus(elements.saveStatus);
  updateStats(state.manuscript, state.activeChapter);
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    saveLocal();
    if (state.isDesktop && state.desktopFileLoaded) {
      void fetch("/api/editor/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: serialize(state.manuscript),
          filename: state.manuscript.filename,
          saveAs: false,
        }),
      }).then(async (res) => {
        if (res.ok) {
          const result = await res.json();
          elements.saveStatus.textContent = `Saved to ${result.name}`;
        }
      }).catch((error) => {
        console.error("Automatic disk save failed.", error);
        elements.saveStatus.textContent = "Saved in app only · disk save failed";
      });
    } else if (state.fileHandle && state.canWrite) {
      void writeFile(state.fileHandle, state.manuscript, elements.saveStatus).catch((error) => {
        state.canWrite = false;
        console.error("Automatic disk save failed.", error);
        elements.saveStatus.textContent = "Saved in app only · disk save failed";
      });
    }
  }, 500);
}

// Event Listeners
elements.editor.addEventListener("input", changed);
elements.editor.addEventListener("paste", (event) => {
  event.preventDefault();
  document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? "");
});
elements.editor.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  // A raw tab character collapses to a single space under normal CSS
  // whitespace rules, so insert non-breaking spaces to render a visible indent.
  document.execCommand("insertText", false, "\u00A0\u00A0\u00A0\u00A0");
});

elements.manuscriptTitle.addEventListener("input", () => {
  state.manuscript.frontmatter.title = elements.manuscriptTitle.value.trim() ||
    "Untitled Manuscript";
  changed();
});

elements.chapterTitle.addEventListener("input", () => {
  const current = state.manuscript.chapters[state.activeChapter];
  if (!current) return;
  current.title = elements.chapterTitle.value.trim() || `Chapter ${state.activeChapter + 1}`;
  element("#chapter-breadcrumb").textContent = current.title;
  changed();
});

element("#add-chapter").addEventListener("click", () => {
  addChapter(elements.editor, elements.chapterTitle, actionCallbacks);
});

element("#sidebar-toggle").addEventListener("click", () => {
  elements.sidebar.classList.toggle("collapsed");
});

element("#save-file").addEventListener("click", () => {
  void saveToDisk(elements.editor, elements.saveStatus, saveLocal);
});

element("#open-file").addEventListener("click", () => {
  void openFileDialog(
    elements.fileInput,
    (file, handle, writable) => loadFile(file, handle, writable, actionCallbacks),
  );
});

element("#new-file").addEventListener("click", () => {
  newManuscript(actionCallbacks);
});

element("#export-file").addEventListener("click", () => {
  download(state.manuscript, elements.saveStatus);
});

element("#modal-open").addEventListener("click", () => {
  void openFileDialog(
    elements.fileInput,
    (file, handle, writable) => loadFile(file, handle, writable, actionCallbacks),
  );
});

element("#modal-new").addEventListener("click", () => {
  newManuscript(actionCallbacks);
});

element("#modal-sample").addEventListener("click", () => {
  loadSample(actionCallbacks);
});

elements.fileInput.addEventListener("change", () => {
  const file = elements.fileInput.files?.[0];
  if (file) void loadFile(file, null, false, actionCallbacks);
  elements.fileInput.value = "";
});

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", () => {
    if (!(button instanceof HTMLElement)) return;
    document.execCommand(button.dataset.command ?? "", false, button.dataset.value);
    elements.editor.focus();
    changed();
  });
}

globalThis.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void saveToDisk(elements.editor, elements.saveStatus, saveLocal);
  }
});

globalThis.addEventListener("dragover", (event) => event.preventDefault());
globalThis.addEventListener("drop", (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file && /\.(?:md|markdown|txt)$/i.test(file.name)) {
    void loadFile(file, null, false, actionCallbacks);
  }
});

// Initialization
const saved = restoreLocal();
if (saved) {
  state.manuscript = saved.manuscript;
  state.activeChapter = saved.activeChapter;
  elements.modal.classList.add("hidden");
}

state.fileHandle = await restoreHandle();
if (state.fileHandle) {
  try {
    state.canWrite = await hasWritePermission(state.fileHandle, false);
  } catch (error) {
    console.warn("The stored file handle is no longer available.", error);
    state.fileHandle = null;
    state.canWrite = false;
    await storeHandle(null);
  }
}

try {
  const response = await fetch("/api/editor/status");
  if (response.ok) {
    const status = await response.json();
    state.isDesktop = status.isDesktop === true;
    state.desktopFileLoaded = typeof status.activeFile === "string";
    if (state.desktopFileLoaded && typeof status.content === "string" && status.activeFile) {
      state.manuscript = parseManuscript(status.content, status.activeFile);
      state.activeChapter = 0;
      state.fileHandle = null;
      state.canWrite = false;
      elements.saveStatus.textContent = `Active file: ${status.activeFile}`;
      elements.modal.classList.add("hidden");
      saveLocal();
    } else if (state.desktopFileLoaded && status.activeFile) {
      state.manuscript.filename = status.activeFile;
      element("#filename").textContent = status.activeFile;
      elements.saveStatus.textContent = `Active file: ${status.activeFile}`;
    }
  }
} catch {
  state.isDesktop = false;
}

if (matchMedia("(max-width: 55rem)").matches) elements.sidebar.classList.add("collapsed");
render();
