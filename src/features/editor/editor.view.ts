import { html } from "../../framework/html/html.ts";
import { createView } from "../../framework/html/template.ts";
import { baseLayout } from "../../views/layouts/base-layout.ts";

type Props = {
  title: string;
};

export const editorView = createView((ctx, props: Props) => {
  return baseLayout({
    title: props.title,
    bodyClass: "editor-mode",
    scripts: html`
      <link rel="stylesheet" href="${ctx.asset("features/editor/editor.client.css")}">
      <script type="module" src="${ctx.asset("features/editor/editor.client.ts")}"></script>
    `,
    content: html`
      <header class="editor-topbar">
        <div class="topbar-group">
          <a class="brand" href="/about">Writasaurus</a>
          <button type="button" id="sidebar-toggle">Chapters</button>
          <input id="manuscript-title" value="Untitled Manuscript" aria-label="Manuscript title">
          <span id="filename">manuscript.md</span>
        </div>
        <strong id="chapter-breadcrumb">Chapter 1</strong>
        <div class="topbar-group">
          <span id="save-status">Saved locally</span>
          <button type="button" id="save-file" class="primary">Save</button>
          <a href="/open" class="button" id="open-file">Open</a>
          <button type="button" id="new-file">New</button>
          <button type="button" id="export-file">Export</button>
          <input id="file-input" type="file" accept=".md,.markdown,.txt" hidden>
        </div>
      </header>

      <main class="editor-main">
        <div class="editor-workspace">
          <editor-sidebar class="editor-sidebar" id="editor-sidebar">
            <div class="sidebar-heading">
              <h2>Chapters</h2>
              <button type="button" id="add-chapter">Add</button>
            </div>
            <ol id="chapter-list"></ol>
            <span id="sidebar-stats">1 chapter</span>
          </editor-sidebar>
          <section class="writing-area">
            <input id="chapter-title" value="Chapter 1: The Beginning" aria-label="Chapter title">
            <editor-toolbar class="editor-toolbar" aria-label="Formatting toolbar" for="#editor">
              <button type="button" data-command="bold"><strong>B</strong></button>
              <button type="button" data-command="italic"><em>I</em></button>
              <button type="button" data-command="formatBlock" data-value="h2">Heading</button>
              <button type="button" data-command="formatBlock" data-value="blockquote">Quote</button>
              <button type="button" data-command="insertUnorderedList">List</button>
            </editor-toolbar>
            <editor-canvas id="editor" class="editor-canvas" contenteditable="true" role="textbox"
              aria-multiline="true">
              <p>Begin the next chapter...</p>
            </editor-canvas>
          </section>
        </div>
      </main>

      <editor-statusbar class="editor-statusbar">
        <span id="chapter-stats">Chapter: 0 words</span>
        <span id="total-stats">Manuscript: 0 words</span>
      </editor-statusbar>
    `,
  });
});
