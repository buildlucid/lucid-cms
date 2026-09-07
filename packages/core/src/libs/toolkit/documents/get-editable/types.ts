import type z from "zod";
import type { inputSchema } from "./schema.js";

/** Identifies the latest stored content to read for editing. */
export type ToolkitDocumentsGetEditableInput<K extends string = string> = Omit<
	z.input<typeof inputSchema>,
	"collectionKey"
> & { collectionKey: K };
