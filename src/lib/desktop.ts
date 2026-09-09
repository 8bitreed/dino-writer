export function dialogCommand(): string {
  if (Deno.build.os === "linux") return "zenity";
  if (Deno.build.os === "darwin") return "osascript";
  return "powershell";
}

export async function chooseFile(
  action: "open" | "save",
  suggestedName = "manuscript.md",
): Promise<string | null> {
  const command = dialogCommand();
  const perm = await Deno.permissions.query({ name: "run", command });
  if (perm.state !== "granted") return null;

  let args: string[];
  if (Deno.build.os === "linux") {
    args = [
      "--file-selection",
      `--title=${action === "open" ? "Open" : "Save"} Manuscript`,
      "--file-filter=Markdown files | *.md *.markdown *.txt",
      ...(action === "save"
        ? ["--save", "--confirm-overwrite", `--filename=${suggestedName}`]
        : []),
    ];
  } else if (Deno.build.os === "darwin") {
    const script = action === "open"
      ? 'POSIX path of (choose file with prompt "Open Manuscript")'
      : `POSIX path of (choose file name with prompt "Save Manuscript" default name "${
        suggestedName.replaceAll('"', "")
      }")`;
    args = ["-e", script];
  } else {
    const dialog = action === "open" ? "OpenFileDialog" : "SaveFileDialog";
    args = [
      "-NoProfile",
      "-Command",
      `Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.${dialog}; ` +
      `$d.Filter='Markdown (*.md;*.markdown;*.txt)|*.md;*.markdown;*.txt'; ` +
      `$d.FileName='${suggestedName.replaceAll("'", "")}'; ` +
      `if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.FileName)}`,
    ];
  }

  try {
    const output = await new Deno.Command(command, {
      args,
      stdout: "piped",
      stderr: "null",
    }).output();
    if (!output.success) return null;
    return new TextDecoder().decode(output.stdout).trim() || null;
  } catch {
    return null;
  }
}

export async function checkIsDesktop(): Promise<boolean> {
  try {
    if (Deno.env.get("DENO_SERVE_ADDRESS") || Deno.env.get("DENO_DESKTOP")) {
      return true;
    }
    const runPerm = await Deno.permissions.query({ name: "run", command: dialogCommand() });
    const writePerm = await Deno.permissions.query({ name: "write" });
    return runPerm.state === "granted" && writePerm.state === "granted";
  } catch {
    return false;
  }
}

function appStateDir(): string | null {
  const home = Deno.env.get("HOME");
  if (Deno.build.os === "linux") {
    const base = Deno.env.get("XDG_DATA_HOME") || (home ? `${home}/.local/share` : null);
    return base ? `${base}/writasaurus` : null;
  }
  if (Deno.build.os === "darwin") {
    return home ? `${home}/Library/Application Support/writasaurus` : null;
  }
  const base = Deno.env.get("LOCALAPPDATA") || Deno.env.get("APPDATA");
  return base ? `${base}\\writasaurus` : null;
}

function lastFilePath(): string | null {
  const dir = appStateDir();
  return dir ? `${dir}/last-file.json` : null;
}

export async function loadLastFilePath(): Promise<string | null> {
  try {
    const path = lastFilePath();
    if (!path) return null;
    const data = JSON.parse(await Deno.readTextFile(path));
    return typeof data?.path === "string" ? data.path : null;
  } catch {
    return null;
  }
}

export async function saveLastFilePath(path: string): Promise<void> {
  try {
    const statePath = lastFilePath();
    if (!statePath) return;
    const dir = appStateDir();
    if (dir) await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(statePath, JSON.stringify({ path }));
  } catch (error) {
    if (!(error instanceof Deno.errors.NotCapable)) {
      console.warn("Could not remember the last opened file.", error);
    }
  }
}

export async function clearLastFilePath(): Promise<void> {
  try {
    const statePath = lastFilePath();
    if (!statePath) return;
    await Deno.remove(statePath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound) && !(error instanceof Deno.errors.NotCapable)) {
      console.warn("Could not clear the last opened file.", error);
    }
  }
}
