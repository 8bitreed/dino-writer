import { join } from "@std/path";

const staticDir = "src/assets/static";
const distDir = "dist";
const assetsDir = join(distDir, "assets");
const manifestPath = join(distDir, "manifest.json");

async function hash(data: BufferSource): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(buffer));
  const hex = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8);
}

async function copyDir(srcDir: string, destDir: string): Promise<void> {
  try {
    for await (const entry of Deno.readDir(srcDir)) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);
      if (entry.isDirectory) {
        await Deno.mkdir(destPath, { recursive: true });
        await copyDir(srcPath, destPath);
      } else if (entry.isFile) {
        await Deno.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

function manifestKey(entry: string): string {
  return entry.replace(/^\.?\/*src\//, "");
}

function outputExtension(entry: string): string {
  return entry.endsWith(".css") ? ".css" : ".js";
}

function outputStem(entry: string): string {
  return manifestKey(entry)
    .replace(/\.[^.]+$/, "")
    .replaceAll("/", "-");
}

async function build(entries: readonly string[]): Promise<void> {
  const startTime = performance.now();
  const tempDir = await Deno.makeTempDir({ prefix: "deno-bundle-" });

  try {
    await Deno.mkdir(assetsDir, { recursive: true });

    try {
      for await (const entry of Deno.readDir(assetsDir)) {
        await Deno.remove(join(assetsDir, entry.name), { recursive: true });
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    try {
      await Deno.remove(join(distDir, ".vite"), { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    const manifest: Record<string, string> = {};
    for (const entry of entries) {
      const extension = outputExtension(entry);
      const bundledPath = join(tempDir, `${outputStem(entry)}${extension}`);
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "bundle",
          "--platform=browser",
          "--minify",
          "-o",
          bundledPath,
          entry,
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await command.output();
      if (!output.success) {
        const stderr = new TextDecoder().decode(output.stderr);
        throw new Error(`Failed to bundle ${entry}:\n${stderr}`);
      }

      const data = await Deno.readFile(bundledPath);
      const contentHash = await hash(data);
      const outputName = `${outputStem(entry)}-${contentHash}${extension}`;
      await Deno.writeFile(join(assetsDir, outputName), data);
      manifest[manifestKey(entry)] = `/assets/${outputName}`;
    }

    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await copyDir(staticDir, distDir);

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`✓ built ${entries.length} asset entries in ${elapsed}ms`);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

export async function bundle(entries: readonly string[]): Promise<void> {
  await build(entries);

  if (!Deno.args.includes("--watch")) return;

  console.log("Watching src for asset changes...");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watcher = Deno.watchFs("src");
  for await (const event of watcher) {
    if (event.kind === "access") continue;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        console.log("Rebuilding assets...");
        await build(entries);
      } catch (error) {
        console.error("Build failed:", error);
      }
    }, 100);
  }
}
