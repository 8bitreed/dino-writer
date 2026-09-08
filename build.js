// @ts-check
import { join } from "@std/path";

const clientDir = "src/client";
const pagesDir = join(clientDir, "pages");
const staticDir = join(clientDir, "static");
const distDir = "dist";
const assetsDir = join(distDir, "assets");
const manifestPath = join(distDir, "manifest.json");

/**
 * @param {BufferSource} data
 * @returns {Promise<string>}
 */
async function hash(data) {
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(buffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8);
}

/**
 * @returns {Promise<Array<{name: string, src: string}>>}
 */
async function getEntries() {
  /** @type {Array<{name: string, src: string}>} */
  const entries = [{ name: "app", src: `${clientDir}/app.js` }];
  try {
    for await (const entry of Deno.readDir(pagesDir)) {
      if (entry.isFile && entry.name.endsWith(".js")) {
        entries.push({
          name: entry.name.slice(0, -3),
          src: `${pagesDir}/${entry.name}`,
        });
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {string} srcDir
 * @param {string} destDir
 */
async function copyDir(srcDir, destDir) {
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

export async function build() {
  const startTime = performance.now();
  const entries = await getEntries();

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

    /** @type {Record<string, {file: string, name: string, src: string, isEntry: boolean, css?: string[]}>} */
    const manifest = {};

    for (const entry of entries) {
      const outJs = join(tempDir, `${entry.name}.js`);
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "bundle",
          "--platform=browser",
          "--minify",
          "-o",
          outJs,
          entry.src,
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await command.output();
      if (!output.success) {
        const stderr = new TextDecoder().decode(output.stderr);
        throw new Error(`Failed to bundle ${entry.src}:\n${stderr}`);
      }

      const jsData = await Deno.readFile(outJs);
      const jsHash = await hash(jsData);
      const hashedJsName = `${entry.name}-${jsHash}.js`;
      await Deno.writeFile(join(assetsDir, hashedJsName), jsData);

      const outCss = join(tempDir, `${entry.name}.css`);
      /** @type {string[]} */
      const cssFiles = [];
      try {
        const cssData = await Deno.readFile(outCss);
        const cssHash = await hash(cssData);
        const hashedCssName = `${entry.name}-${cssHash}.css`;
        await Deno.writeFile(join(assetsDir, hashedCssName), cssData);
        cssFiles.push(`assets/${hashedCssName}`);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }

      manifest[entry.src] = {
        file: `assets/${hashedJsName}`,
        name: entry.name,
        src: entry.src,
        isEntry: true,
        css: cssFiles,
      };
    }

    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await copyDir(staticDir, distDir);

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`✓ built ${entries.length} bundle(s) in ${elapsed}ms`);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

if (import.meta.main) {
  await build();

  if (Deno.args.includes("--watch")) {
    console.log("Watching src/client for changes...");
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    const watcher = Deno.watchFs("src/client");
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
