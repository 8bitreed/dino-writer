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
        <div class="topbar-left">
          <button type="button" id="sidebar-toggle" aria-label="Toggle chapters">Chapters</button>
        </div>
        <div class="topbar-center">
          <input id="manuscript-title" value="Untitled Manuscript" aria-label="Manuscript title"
            placeholder="Untitled Manuscript">
          <span id="filename">manuscript.md</span>
          <span id="save-status">Saved locally</span>
        </div>
        <strong id="chapter-breadcrumb" hidden>Chapter 1</strong>
        <div class="topbar-right">
          <button type="button" id="menu-toggle" class="menu-toggle" aria-label="Menu"
            aria-expanded="false" aria-haspopup="true">
            <span class="hamburger-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
        <nav id="app-menu" class="app-menu" hidden aria-label="Application menu">
          <button type="button" id="save-file" class="menu-item primary">Save</button>
          <a href="/open" class="menu-item" id="open-file">Open</a>
          <div class="menu-divider"></div>
          <a href="/about" class="menu-item" id="about-link">About</a>
          <input id="file-input" type="file" accept=".md,.markdown,.txt" hidden>
        </nav>
      </header>

      <main class="editor-main">
        <div class="editor-workspace">
          <editor-sidebar class="editor-sidebar collapsed" id="editor-sidebar">
            <div class="sidebar-heading">
              <h2>Chapters</h2>
              <button type="button" id="add-chapter">Add</button>
            </div>
            <ol id="chapter-list"></ol>
            <span id="sidebar-stats">1 chapter</span>
          </editor-sidebar>
          <section class="writing-area">
            <input id="chapter-title" value="Chapter " aria-label="Chapter title">
            <!--<editor-toolbar style="display: none!" class="editor-toolbar" aria-label="Formatting toolbar"
              for="#editor">
              <button type="button" data-command="bold"><strong>B</strong></button>
              <button type="button" data-command="italic"><em>I</em></button>
              <button type="button" data-command="formatBlock" data-value="h2">Heading</button>
              <button type="button" data-command="formatBlock" data-value="blockquote">Quote</button>
              <button type="button" data-command="insertUnorderedList">List</button>
            </editor-toolbar>-->
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
