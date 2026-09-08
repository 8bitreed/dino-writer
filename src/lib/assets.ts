export interface AssetEntry {
  file?: string;
  css?: string[];
  src?: string;
  name?: string;
  isEntry?: boolean;
}

export type AssetResolver = (name: string) => {
  script: string;
  styles: string[];
};

export async function loadAssets(): Promise<AssetResolver> {
  const manifest: Record<string, AssetEntry> = JSON.parse(
    await Deno.readTextFile("./dist/manifest.json"),
  );

  return function asset(name: string) {
    const baseName = name.replace(/\.(js|ts)$/, "");
    const matches = Object.values(manifest).filter((entry) =>
      entry.isEntry && (entry.name === baseName || entry.src?.endsWith(`/${name}`))
    );
    if (matches.length !== 1 || !matches[0].file) {
      throw new Error(`Manifest has no unique ${name} entry`);
    }
    return {
      script: `/${matches[0].file}`,
      styles: (matches[0].css ?? []).map((path) => `/${path}`),
    };
  };
}
