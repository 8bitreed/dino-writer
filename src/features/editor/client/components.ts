export class EditorToolbar extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener("click", this.#handleClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#handleClick);
  }

  #handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("[data-command]");
    if (!button || !this.contains(button)) return;

    const command = button.dataset.command;
    if (!command) return;
    const value = button.dataset.value;

    document.execCommand(command, false, value);

    const targetSelector = this.getAttribute("for") || "#editor";
    const editor = document.querySelector<HTMLElement>(targetSelector);
    editor?.focus();

    this.dispatchEvent(
      new CustomEvent("command", {
        bubbles: true,
        detail: { command, value },
      }),
    );
  };
}

export class EditorSidebar extends HTMLElement {
  get collapsed(): boolean {
    return this.classList.contains("collapsed");
  }

  set collapsed(value: boolean) {
    this.classList.toggle("collapsed", value);
    this.dispatchEvent(
      new CustomEvent("toggle", {
        bubbles: true,
        detail: { collapsed: value },
      }),
    );
  }

  toggle(): boolean {
    this.collapsed = !this.collapsed;
    return this.collapsed;
  }

  collapse(): void {
    this.collapsed = true;
  }

  expand(): void {
    this.collapsed = false;
  }
}

export class EditorCanvas extends HTMLElement {
  connectedCallback(): void {
    if (!this.hasAttribute("contenteditable")) {
      this.setAttribute("contenteditable", "true");
    }
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "textbox");
    }
    if (!this.hasAttribute("aria-multiline")) {
      this.setAttribute("aria-multiline", "true");
    }

    this.addEventListener("paste", this.#handlePaste);
    this.addEventListener("keydown", this.#handleKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener("paste", this.#handlePaste);
    this.removeEventListener("keydown", this.#handleKeyDown);
  }

  #handlePaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text);
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    // A raw tab character collapses to a single space under normal CSS
    // whitespace rules, so insert non-breaking spaces to render a visible indent.
    document.execCommand("insertText", false, "\u00A0\u00A0\u00A0\u00A0");
  };
}

export class EditorStatusbar extends HTMLElement {
  #chapterStats: HTMLElement | null = null;
  #totalStats: HTMLElement | null = null;

  connectedCallback(): void {
    this.#chapterStats = this.querySelector("#chapter-stats");
    this.#totalStats = this.querySelector("#total-stats");
  }

  setStats(options: {
    chapterWords: number;
    chapterChars: number;
    totalWords: number;
  }): void {
    if (!this.#chapterStats) this.#chapterStats = this.querySelector("#chapter-stats");
    if (!this.#totalStats) this.#totalStats = this.querySelector("#total-stats");

    if (this.#chapterStats) {
      this.#chapterStats.textContent =
        `Chapter: ${options.chapterWords} words · ${options.chapterChars} characters`;
    }
    if (this.#totalStats) {
      this.#totalStats.textContent = `Manuscript: ${options.totalWords.toLocaleString()} words · ${
        (options.totalWords / 300).toFixed(1)
      } pages`;
    }
  }
}

export function registerEditorComponents(): void {
  if (!customElements.get("editor-toolbar")) {
    customElements.define("editor-toolbar", EditorToolbar);
  }
  if (!customElements.get("editor-sidebar")) {
    customElements.define("editor-sidebar", EditorSidebar);
  }
  if (!customElements.get("editor-canvas")) {
    customElements.define("editor-canvas", EditorCanvas);
  }
  if (!customElements.get("editor-statusbar")) {
    customElements.define("editor-statusbar", EditorStatusbar);
  }
}

registerEditorComponents();
