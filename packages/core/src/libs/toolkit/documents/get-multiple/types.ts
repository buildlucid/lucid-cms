import type {
	CollectionDocumentKey,
	ContentDocument,
	ContentDocumentMultipleQuery,
	ContentList,
	IsLocalized,
} from "../../../../exports/types.js";
import type { ToolkitDocumentsGetSingleInput } from "../get-single/types.js";

export type ToolkitDocumentsGetMultipleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<ContentDocumentMultipleQuery<TCollectionKey>, "page" | "perPage"> & {
	/** One-based page number. */
	page?: number;
	/** Maximum documents per page. Use -1 to request all matching documents. */
	perPage?: number;
};

/** A content API documents read: collection, version, optional preview, locale and query. */
export type ToolkitDocumentsGetMultipleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = Omit<ToolkitDocumentsGetSingleInput<TCollectionKey, TLocale>, "query"> & {
	/** Filters, sorting, pagination and what to include. */
	query?: ToolkitDocumentsGetMultipleQuery<TCollectionKey>;
};

/** A page of documents as the content API returns them, and where the page is. */
export type ToolkitDocumentsGetMultipleResult<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = ContentList<ContentDocument<TCollectionKey, IsLocalized<TLocale>>>;
