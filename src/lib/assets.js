// @ts-check

export async function loadAssets() {
  /** @type {Record<string, {
   * file?: string, css?: string[], src?: string, isEntry?: boolean
   * }>} */
  const manifest = JSON.parse(await Deno.readTextFile("./dist/.vite/manifest.json"));

  /** @param {string} name */
  return function asset(name) {
    const matches = Object.values(manifest).filter((entry) =>
      entry.isEntry && entry.src?.endsWith(`/${name}`)
    );
    if (matches.length !== 1 || !matches[0].file) {
      throw new Error(`Vite manifest has no unique ${name} entry`);
    }
    return {
      script: `/${matches[0].file}`,
      styles: (matches[0].css ?? []).map((path) => `/${path}`),
    };
  };
}
