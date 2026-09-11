import mf from "../../dist/manifest.json" with { type: "json" };

export interface AssetEntry {
  script: string;
  styles: string[];
}

export type AssetResolver = (name?: string) => AssetEntry;

export const loadAssets = (): AssetResolver => {
  const manifest: Record<string, AssetEntry> = mf;

  return function asset(name = "editor"): AssetEntry {
    const key = name.replace(/\.(js|ts)$/, "");
    const entry = manifest[key] ?? manifest["editor"];
    if (!entry) {
      throw new Error(`Asset not found in manifest: ${name}`);
    }
    return entry;
  };
};
