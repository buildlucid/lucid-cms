import type z from "zod";
import type { CollectionDocumentData, DocumentEditToken } from "../types.js";
import type { inputSchema } from "./schema.js";

/** Values to save to latest or the `requestId` proposal, preserving omitted fields. */
export type ToolkitDocumentsUpdateSingleInput<
	TCollectionKey extends string = string,
> = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged" | "collectionKey" | "data"
> & {
	collectionKey: TCollectionKey;
	/** Reject the write if this token no longer matches the content being edited. */
	ifUnchanged?: DocumentEditToken;
	data: CollectionDocumentData<TCollectionKey>;
};
