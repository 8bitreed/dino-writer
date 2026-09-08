import { createApp } from "./src/app.ts";

const app = await createApp();

Deno.serve(app.fetch);
