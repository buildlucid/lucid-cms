import type z from "zod";
import type { inputSchema } from "./schema.js";

/** Replacement file and supplied image, audio or video metadata. */
export type ToolkitMediaReplaceFileInput = z.input<typeof inputSchema>;

/** ID of the media item whose file was replaced. */
export type ToolkitMediaReplaceFileResult = { id: number };
