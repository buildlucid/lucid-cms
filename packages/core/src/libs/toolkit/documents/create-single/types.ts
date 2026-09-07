import type z from "zod";
import type { CollectionDocumentData } from "../types.js";
import type { inputSchema } from "./schema.js";

/** Values for a new document. Omitted fields use their configured defaults. */
export type ToolkitDocumentsCreateSingleInput<
	TCollectionKey extends string = string,
> = Omit<z.input<typeof inputSchema>, "collectionKey" | "data"> & {
	collectionKey: TCollectionKey;
	data: CollectionDocumentData<TCollectionKey>;
};
