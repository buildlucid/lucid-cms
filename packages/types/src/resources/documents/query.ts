import type { ContentLocaleInput } from "../content/types.js";
import type {
	CollectionDocumentKey,
	CollectionDocumentVersionKey,
	CollectionType,
} from "./types.js";

export type FilterValue =
	| string
	| string[]
	| number
	| number[]
	| boolean
	| boolean[]
	| null;

export type FilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "in"
	| "not-in"
	| "is"
	| "is-not"
	| "contains"
	| "not-contains"
	| "starts-with"
	| "not-starts-with"
	| "ends-with"
	| "not-ends-with";

/** A value compared with an operator. Omitting the operator matches for equality, `in` for arrays and `is` for null. */
export type FilterObject<TValue extends FilterValue = FilterValue> = {
	value: TValue;
	operator?: FilterOperator;
};

/** A plain value, matched like a `FilterObject` without an operator, or a value with an operator. */
export type FilterCondition<TValue extends FilterValue = FilterValue> =
	| TValue
	| FilterObject<TValue>;

/**
 * Document filters for collections type generation hasn't seen: document properties such as `id`,
 * then `fields` by field key and `bricks` by brick and field key.
 *
 * @example
 * ```ts
 * { id: 1, fields: { title: "Hello" }, bricks: { hero: { heading: { value: "Hi", operator: "contains" } } } }
 * ```
 */
export type DocumentFilters = {
	[key: string]: FilterCondition | DocumentFilters | undefined;
};

export type CollectionDocumentFilters<TCollectionKey extends string = string> =
	CollectionType<TCollectionKey, "filters", DocumentFilters>;

/** One filter object, whose conditions must all match, or a list of them, where any may match. */
export type CollectionDocumentFilterInput<
	TCollectionKey extends string = string,
> =
	| CollectionDocumentFilters<TCollectionKey>
	| Array<CollectionDocumentFilters<TCollectionKey>>;

export type SortDirection = "asc" | "desc";

export type DefaultCollectionDocumentSortKey =
	| "createdAt"
	| "updatedAt"
	| "order"
	| `fields.${string}`;

export type CollectionDocumentSortKey<TCollectionKey extends string = string> =
	CollectionType<TCollectionKey, "sorts", DefaultCollectionDocumentSortKey>;

export type CollectionDocumentSorts<TCollectionKey extends string = string> =
	Array<{
		key: CollectionDocumentSortKey<TCollectionKey>;
		direction: SortDirection;
	}>;

/** What document reads can return alongside fields. */
export type ContentDocumentInclude = "bricks" | "meta";

/** What a read of one document takes, apart from its locale. */
export type DocumentReadOptions<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	collectionKey: TCollectionKey;
	/** The version to read: `latest` or one of the collection's environments. */
	version: CollectionDocumentVersionKey<TCollectionKey>;
	/** One filter object, whose conditions must all match, or a list of them, where any may match. */
	filter?: CollectionDocumentFilterInput<TCollectionKey>;
	/** What to return alongside fields, such as `["bricks"]`. */
	include?: ContentDocumentInclude[];
	/** How many levels of related documents to fill in, from 0 to 3, defaulting to 1. */
	depth?: number;
	/** The locale empty translations fall back to, such as the default locale. */
	fallbackLocale?: string;
};

/** What a read of a page of documents takes, apart from its locale. */
export type DocumentListOptions<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = DocumentReadOptions<TCollectionKey> & {
	sort?: CollectionDocumentSorts<TCollectionKey>;
	/** One-based page number. */
	page?: number;
	/** Maximum documents per page. Use -1 for all matches. */
	perPage?: number;
};

/** Reads one document, which the client and the server toolkit both accept. */
export type DocumentReadInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = DocumentReadOptions<TCollectionKey> & ContentLocaleInput<TLocale>;

/** Reads a page of documents, which the client and the server toolkit both accept. */
export type DocumentListInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = DocumentListOptions<TCollectionKey> & ContentLocaleInput<TLocale>;
