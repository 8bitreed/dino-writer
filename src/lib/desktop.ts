export function dialogCommand(): string {
  if (Deno.build.os === "linux") return "zenity";
  if (Deno.build.os === "darwin") return "osascript";
  return "powershell";
}

export async function defaultChooseFile(
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
      `$d.FileName='${suggestedName.replaceAll("'", "") }'; ` +
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

export async function defaultIsDesktop(): Promise<boolean> {
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
