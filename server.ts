import { createApp } from "./src/app.ts";
import "./src/desktop.ts";

const app = await createApp();

Deno.serve(app.fetch);
