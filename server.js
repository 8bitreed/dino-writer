// @ts-check
import { createApp } from "./src/app.js";

const app = await createApp();

Deno.serve(app.fetch);
