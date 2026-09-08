import { createApp } from "./src/app.tsx";
import "./src/desktop.ts"

const app = await createApp();

Deno.serve(app.fetch);
