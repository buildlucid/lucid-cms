import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentMultipleQuery,
	Refs,
} from "../../../../exports/types.js";
import type { ToolkitDocumentVersion } from "../index.js";

export type ToolkitDocumentsGetMultipleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<
	CollectionDocumentMultipleQuery<TCollectionKey>,
	"page" | "perPage"
> & {
	/** One-based page number. */
	page?: number;
	/** Maximum documents per page. Use -1 to request all matching documents. */
	perPage?: number;
};

/** Collection, required content version and optional query for a server-side document lookup. */
export type ToolkitDocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	/** Key of the registered collection to read. */
	collectionKey: TCollectionKey;
	/** Content version to read, such as published or latest. */
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	/** Filters, includes and other query options. */
	query?: ToolkitDocumentsGetMultipleQuery<TCollectionKey>;
};

/** Document content and shared references returned inside the service result's data property. */
export type ToolkitDocumentsGetMultipleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	documents: CollectionDocument<TCollectionKey>[];
	/** Total matching documents before pagination. */
	count: number;
	/** Shared reference registry for resolving document field references. */
	refs?: Refs;
};
