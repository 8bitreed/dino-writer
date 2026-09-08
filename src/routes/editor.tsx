import { Hono } from "@hono/hono";
import type { FC } from "@hono/hono/jsx";

const EditorHeader: FC = () => (
  <header class="editor-topbar">
    <div class="topbar-group">
      <a class="brand" href="/">Writer Tools</a>
      <button type="button" id="sidebar-toggle">Chapters</button>
      <input id="manuscript-title" value="Untitled Manuscript" aria-label="Manuscript title" />
      <span id="filename">manuscript.md</span>
    </div>
    <strong id="chapter-breadcrumb">Chapter 1</strong>
    <div class="topbar-group">
      <span id="save-status">Saved locally</span>
      <button type="button" id="save-file" class="primary">Save</button>
      <button type="button" id="open-file">Open</button>
      <button type="button" id="new-file">New</button>
      <button type="button" id="export-file">Export</button>
      <input id="file-input" type="file" accept=".md,.markdown,.txt" hidden />
    </div>
  </header>
);

const EditorFooter: FC = () => (
  <footer class="editor-statusbar">
    <span id="chapter-stats">Chapter: 0 words</span>
    <span id="total-stats">Manuscript: 0 words</span>
  </footer>
);

export function editorRoutes(_layout?: unknown): Hono {
  return new Hono().get("/editor", (c) =>
    c.render(
      <>
        <div class="editor-workspace">
          <aside class="editor-sidebar" id="editor-sidebar">
            <div class="sidebar-heading">
              <h2>Chapters</h2>
              <button type="button" id="add-chapter">Add</button>
            </div>
            <ol id="chapter-list"></ol>
            <span id="sidebar-stats">1 chapter</span>
          </aside>
          <section class="writing-area">
            <input id="chapter-title" value="Chapter 1: The Beginning" aria-label="Chapter title" />
            <div class="editor-toolbar" aria-label="Formatting toolbar">
              <button type="button" data-command="bold">
                <strong>B</strong>
              </button>
              <button type="button" data-command="italic">
                <em>I</em>
              </button>
              <button type="button" data-command="formatBlock" data-value="h2">Heading</button>
              <button type="button" data-command="formatBlock" data-value="blockquote">
                Quote
              </button>
              <button type="button" data-command="insertUnorderedList">List</button>
            </div>
            <div
              id="editor"
              class="editor-canvas"
              contenteditable
              role="textbox"
              aria-multiline="true"
            >
              <p>Begin the next chapter...</p>
            </div>
          </section>
        </div>
        <div class="editor-modal hidden" id="welcome-modal" role="dialog" aria-modal="true">
          <div class="modal-card stack">
            <h2>Open Manuscript</h2>
            <p>Open a Markdown manuscript or begin with a blank document.</p>
            <button type="button" id="modal-open" class="button primary">Browse Local File</button>
            <button type="button" id="modal-new" class="button">Start New Manuscript</button>
            <button type="button" id="modal-sample" class="button">Load Sample Novel</button>
          </div>
        </div>
      </>,
      {
        title: "Manuscript",
        scripts: ["editor.js"],
        bodyClass: "editor-mode",
        mainClass: "editor-main",
        header: <EditorHeader />,
        footer: <EditorFooter />,
      },
    ));
}
