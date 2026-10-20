import type {
	CollectionDocumentKey,
	ContentDocumentSingleQuery,
	ContentLocaleInput,
} from "../../../../exports/types.js";
import type { ToolkitDocumentVersion } from "../index.js";

export type ToolkitDocumentsGetSingleQuery<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = ContentDocumentSingleQuery<TCollectionKey>;

/** A content API document read: collection, version, optional preview, locale and query. */
export type ToolkitDocumentsGetSingleInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = {
	/** Key of the registered collection to read. */
	collectionKey: TCollectionKey;
	/** Content version to read, such as published or latest. */
	version: ToolkitDocumentVersion<TCollectionKey>;
	/** Optional preview context that may override the requested version. */
	preview?: string | null;
	/** Reads this locale's value where the `locale` translation is empty. */
	fallbackLocale?: string;
	/** Levels of related documents to resolve into routes and fields, defaulting to 1. */
	depth?: number;
	/** Filters and what to include, such as `["bricks"]`. */
	query?: ToolkitDocumentsGetSingleQuery<TCollectionKey>;
} & ContentLocaleInput<TLocale>;
