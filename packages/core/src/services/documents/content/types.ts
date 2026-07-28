import type { CollectionDocumentVersion } from "../../../types.js";

export type ContentDocumentVersionInput<
	TCollectionKey extends string = string,
> = {
	versionType: CollectionDocumentVersion<TCollectionKey>;
	versionId?: number;
	preview?: string;
};
