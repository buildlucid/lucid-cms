import type z from "zod";
import type { CollectionDocumentPatch, DocumentEditToken } from "../types.js";
import type { inputSchema } from "./schema.js";

/** Changes to apply in order to the latest document. */
export type ToolkitDocumentsPatchSingleInput<
	TCollectionKey extends string = string,
> = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged" | "collectionKey" | "operations"
> & {
	collectionKey: TCollectionKey;
	/** Reject the write if this token no longer matches the latest content. */
	ifUnchanged?: DocumentEditToken;
	operations: CollectionDocumentPatch<TCollectionKey>[];
};
