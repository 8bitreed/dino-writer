import { bundle } from "./src/framework/bundle/bundle.ts";

const entries = [
  "src/features/editor/editor.client.ts",
  "src/features/editor/editor.css",
];

await bundle(entries);
