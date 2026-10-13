import type z from "zod";
import type { inputSchema } from "./schema.js";

/** Identifies the document to read for editing, from latest or the request proposal selected by `requestId`. */
export type ToolkitDocumentsGetEditableInput<K extends string = string> = Omit<
	z.input<typeof inputSchema>,
	"collectionKey"
> & { collectionKey: K };
