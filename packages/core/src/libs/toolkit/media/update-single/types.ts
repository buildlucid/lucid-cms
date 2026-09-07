import type z from "zod";
import type { inputSchema } from "./schema.js";

/** Media details to change. Omitted values are preserved. */
export type ToolkitMediaUpdateSingleInput = z.input<typeof inputSchema>;

/** ID of the updated media item. */
export type ToolkitMediaUpdateSingleResult = { id: number };
