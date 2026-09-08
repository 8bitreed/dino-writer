import { createApp } from "./app.tsx";

const port = Number(Deno.env.get("PORT") ?? 8000);
const app = await createApp();

console.log(`Listening on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);
