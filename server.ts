import { createApp } from "./src/app.ts";
import "./src/desktop.ts";

const app = await createApp({ csrfProtection: true });

Deno.serve(app.fetch);
