import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentSingleQuery,
	Refs,
} from "../../../../exports/types.js";
import type { ToolkitDocumentVersion } from "../index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<CollectionDocumentSingleQuery<TCollectionKey>, never>;

/** Collection, required content version and optional query for a server-side document lookup. */
export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	/** Key of the registered collection to read. */
	collectionKey: TCollectionKey;
	/** Content version to read, such as published or latest. */
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	/** Filters, includes and other query options. */
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
};

/** Document content and shared references returned inside the service result's data property. */
export type ToolkitDocumentsGetSingleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	document: CollectionDocument<TCollectionKey>;
	/** Shared reference registry for resolving document field references. */
	refs?: Refs;
};
