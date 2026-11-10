import type {
	CollectionDocumentKey,
	DocumentReadInput,
} from "../../../../exports/types.js";

/** Content document read options, also accepted by the client's `documents.getSingle`. */
export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = DocumentReadInput<TCollectionKey, TLocale> & {
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
};
