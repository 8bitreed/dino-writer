import mf from "../../dist/manifest.json" with { type: "json" };

export type AssetResolver = (path: string) => string;

export const loadAssets = (): AssetResolver => {
  const manifest: Record<string, string> = mf;

  return function asset(path: string): string {
    const key = path.replace(/^\.?\/*src\//, "");
    const url = manifest[key];
    if (!url) {
      throw new Error(`Asset not found in manifest: ${path}`);
    }
    return url;
  };
};
