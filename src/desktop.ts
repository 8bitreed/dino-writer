type DesktopWindow = {
  setSize?: (w: number, h: number) => void;
  setTitle?: (t: string) => void;
  setApplicationMenu?: (menu: unknown[]) => void;
  executeJs?: (code: string) => Promise<unknown>;
  addEventListener?: (
    type: string,
    cb: (e: { detail?: { id?: string } }) => void,
  ) => void;
};

const desktop = Deno as unknown as {
  BrowserWindow?: new (opts: Record<string, unknown>) => DesktopWindow;
};

function applicationMenu() {
  const item = (label: string, id: string, accelerator?: string) => ({
    item: { label, id, accelerator, enabled: true },
  });

  return [
    {
      submenu: {
        label: "File",
        items: [
          item("Save", "save-file", "CmdOrCtrl+S"),
          item("Open", "open-file", "CmdOrCtrl+O"),
          item("Quit", "quit", "CmdOrCtrl+Q"),
        ],
      },
    },
    {
      submenu: {
        label: "Help",
        items: [
          "separator",
          item("About", "about"),
        ],
      },
    },
  ];
}

if (desktop.BrowserWindow) {
  const win = new desktop.BrowserWindow({
    title: "Writasaurus",
    width: 1000,
    height: 700,
  });

  win.setApplicationMenu?.(applicationMenu());
  win.addEventListener?.("close", () => {
    Deno.exit(0);
  });
  win.addEventListener?.("menuclick", (e) => {
    const id = e.detail?.id;
    if (id === "quit") {
      Deno.exit(0);
    }
    const calls: Record<string, string> = {
      "save-file": "globalThis.writasaurus?.save()",
      "open-file": "globalThis.writasaurus?.open()",
      "about": "globalThis.writasaurus?.about()",
    };
    if (id && calls[id]) {
      win.executeJs?.(calls[id]);
    }
  });
}
