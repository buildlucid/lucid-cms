import type z from "zod";
import type { CollectionDocumentData, DocumentEditToken } from "../types.js";
import type { inputSchema } from "./schema.js";

/** Document values to save. Omitted fields keep their existing values on update. */
export type ToolkitDocumentsUpdateSingleInput<
	TCollectionKey extends string = string,
> = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged" | "collectionKey" | "data"
> & {
	collectionKey: TCollectionKey;
	/** Reject the write if this token no longer matches the latest content. */
	ifUnchanged?: DocumentEditToken;
	data: CollectionDocumentData<TCollectionKey>;
};
