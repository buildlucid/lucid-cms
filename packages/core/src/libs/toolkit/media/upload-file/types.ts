import type z from "zod";
import type { inputSchema } from "./schema.js";

/** ID of the uploaded media item. */
export type ToolkitMediaUploadFileResult = { id: number };

/** Optional media text, visibility and supplied image, audio or video metadata. */
export type ToolkitMediaUploadFileInput = z.input<typeof inputSchema>;

/** File, bytes or a binary stream accepted by the media toolkit. */
export type ToolkitMediaFile = ToolkitMediaUploadFileInput["file"];
