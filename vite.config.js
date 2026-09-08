// @ts-check
import { defineConfig } from "npm:vite@7.1.4";

const pages = Object.fromEntries(
  [...Deno.readDirSync("client/pages")]
    .filter((entry) => entry.isFile && entry.name.endsWith(".js"))
    .map((entry) => [entry.name.slice(0, -3), `client/pages/${entry.name}`]),
);

export default defineConfig({
  publicDir: "client/static",
  build: {
    manifest: true,
    rollupOptions: {
      input: { app: "client/app.js", ...pages },
    },
  },
});
