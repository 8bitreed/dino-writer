import { createApp } from "./app.ts";

const port = Number(Deno.env.get("PORT") ?? 8000);
const app = await createApp({ csrfProtection: true });

console.log(`Listening on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);
