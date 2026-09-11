/**
 * Converts a string to a slug format.
 * Example: "Hello World!" becomes "hello-world"
 */
export function createSlugFromString(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Counts the number of words and characters in a given string.
 */
export function getWordAndCharCountFromString(text: string): { words: number; chars: number } {
  const clean = text.trim();
  return { words: clean ? clean.split(/\s+/).length : 0, chars: clean.length };
}
