export interface AssetEntry {
  script: string;
  styles: string[];
}

export type AssetResolver = (name?: string) => AssetEntry;

export async function loadAssets(): Promise<AssetResolver> {
  const manifest: Record<string, AssetEntry> = JSON.parse(
    await Deno.readTextFile("./dist/manifest.json"),
  );

  return function asset(name = "editor"): AssetEntry {
    const key = name.replace(/\.(js|ts)$/, "");
    const entry = manifest[key] ?? manifest["editor"];
    if (!entry) {
      throw new Error(`Asset not found in manifest: ${name}`);
    }
    return entry;
  };
}
