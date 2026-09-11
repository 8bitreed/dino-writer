import { bundle } from "./src/framework/bundle/bundle.ts";

// auto load all css and ts files that end with .client.ts or .client.css

function autoLoadClientFiles(path: string = "src/features"): string[] {
  const entries: string[] = [];

  // recursively
  for (const entry of Deno.readDirSync(path)) {
    if (entry.isDirectory) {
      entries.push(...autoLoadClientFiles(`${path}/${entry.name}`));
    } else if (
      entry.isFile && (entry.name.endsWith(".client.ts") || entry.name.endsWith(".client.css"))
    ) {
      entries.push(`${path}/${entry.name}`);
    }
  }
  return entries;
}

await bundle(autoLoadClientFiles());
