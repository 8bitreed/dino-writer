import { createApp } from "./src/app.tsx";

const app = await createApp();

Deno.serve(app.fetch);
