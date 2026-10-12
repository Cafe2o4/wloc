import { handle } from "hono/cloudflare-pages";
import app from "../src/index.js";

export const onRequest = handle(app);
