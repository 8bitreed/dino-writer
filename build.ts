import { join } from "@std/path";

const entrySrc = "src/assets/pages/editor.ts";
const staticDir = "src/assets/static";
const distDir = "dist";
const assetsDir = join(distDir, "assets");
const manifestPath = join(distDir, "manifest.json");

async function hash(data: BufferSource): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(buffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function build(): Promise<void> {
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

    const outJs = join(tempDir, "editor.js");
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--platform=browser",
        "--minify",
        "-o",
        outJs,
        entrySrc,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await command.output();
    if (!output.success) {
      const stderr = new TextDecoder().decode(output.stderr);
      throw new Error(`Failed to bundle ${entrySrc}:\n${stderr}`);
    }

    const jsData = await Deno.readFile(outJs);
    const jsHash = await hash(jsData);
    const hashedJsName = `editor-${jsHash}.js`;
    await Deno.writeFile(join(assetsDir, hashedJsName), jsData);

    const outCss = join(tempDir, "editor.css");
    const cssFiles: string[] = [];
    try {
      const cssData = await Deno.readFile(outCss);
      const cssHash = await hash(cssData);
      const hashedCssName = `editor-${cssHash}.css`;
      await Deno.writeFile(join(assetsDir, hashedCssName), cssData);
      cssFiles.push(`/assets/${hashedCssName}`);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    const manifest = {
      editor: {
        script: `/assets/${hashedJsName}`,
        styles: cssFiles,
      },
    };

    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await copyDir(staticDir, distDir);

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`✓ built editor bundle in ${elapsed}ms`);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

if (import.meta.main) {
  await build();

  if (Deno.args.includes("--watch")) {
    console.log("Watching src/assets for changes...");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watcher = Deno.watchFs("src/assets");
    for await (const event of watcher) {
      if (event.kind === "access") continue;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          console.log("Rebuilding assets...");
          await build();
        } catch (error) {
          console.error("Build failed:", error);
        }
      }, 100);
    }
  }
}
