import type { DocumentVersionType } from "../libs/db/tables/index.js";
import type { RefResource } from "./response.js";

// -----------------------------------------------
// Filters
export type FilterValue =
	| string
	| Array<string>
	| boolean
	| Array<boolean>
	| number
	| Array<number>
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
export type FilterObject<TValue extends FilterValue = FilterValue> = {
	value: TValue;
	operator?: FilterOperator;
};
export type QueryParamFilters = Record<string, FilterObject>;
export type QueryParamFilterCondition = FilterObject & {
	key: string;
};
export type QueryParamFilterGroups = QueryParamFilterCondition[][];
export type QueryFilters = {
	[key: string]: FilterObject | QueryFilters | undefined;
};

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentFiltersByCollection {}

type CollectionDocumentFilterCollectionKey = Extract<
	keyof CollectionDocumentFiltersByCollection,
	string
>;

export type CollectionDocumentFilters<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentFilterCollectionKey
		? CollectionDocumentFiltersByCollection[TCollectionKey]
		: QueryFilters;

/** Accepts one AND filter object or OR groups represented as filter objects. */
export type CollectionDocumentFilterInput<
	TCollectionKey extends string = string,
> =
	| CollectionDocumentFilters<TCollectionKey>
	| Array<CollectionDocumentFilters<TCollectionKey>>;

// -----------------------------------------------
// Sorts
export type SortDirection = "asc" | "desc";
export type QueryParamSorts = Array<{
	key: string;
	direction: SortDirection;
}>;

export type DefaultCollectionDocumentSortKey =
	| "createdAt"
	| "updatedAt"
	| "order"
	| `_${string}`;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentSortsByCollection {}

type CollectionDocumentSortCollectionKey = Extract<
	keyof CollectionDocumentSortsByCollection,
	string
>;

export type CollectionDocumentSortKey<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentSortCollectionKey
		? CollectionDocumentSortsByCollection[TCollectionKey]
		: DefaultCollectionDocumentSortKey;

export type CollectionDocumentSorts<TCollectionKey extends string = string> =
	Array<{
		key: CollectionDocumentSortKey<TCollectionKey>;
		direction: SortDirection;
	}>;

// -----------------------------------------------
// Versions
export type DefaultCollectionDocumentVersion = DocumentVersionType;
export type DefaultCollectionDocumentVersionKey = string;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionsByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionKeysByCollection {}

type CollectionDocumentVersionCollectionKey = Extract<
	keyof CollectionDocumentVersionsByCollection,
	string
>;

type CollectionDocumentVersionKeyCollectionKey = Extract<
	keyof CollectionDocumentVersionKeysByCollection,
	string
>;

export type CollectionDocumentVersion<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentVersionCollectionKey
		? CollectionDocumentVersionsByCollection[TCollectionKey]
		: DefaultCollectionDocumentVersion;

export type CollectionDocumentVersionKey<
	TCollectionKey extends string = string,
> = TCollectionKey extends CollectionDocumentVersionKeyCollectionKey
	? CollectionDocumentVersionKeysByCollection[TCollectionKey]
	: DefaultCollectionDocumentVersionKey;

// -----------------------------------------------
// Includes
export type QueryParamIncludes = Array<string>;

// -----------------------------------------------
// Excludes
export type QueryParamExcludes = Array<string>;

// -----------------------------------------------
// Pagination
export type QueryParamPagination = {
	page: number;
	perPage: number;
};

// -----------------------------------------------
// Query Params
export type QueryParams = {
	filter: QueryParamFilters | undefined;
	filterOr: QueryParamFilterGroups | undefined;
	sort: QueryParamSorts | undefined;
	include: QueryParamIncludes | undefined;
	exclude: QueryParamExcludes | undefined;
	page: QueryParamPagination["page"];
	perPage: QueryParamPagination["perPage"];
};

export type CollectionDocumentRefInclude = "refs" | `refs.${RefResource}`;
export type CollectionDocumentSingleInclude =
	| "bricks"
	| "meta"
	| CollectionDocumentRefInclude;
export type CollectionDocumentMultipleInclude =
	| "bricks"
	| "meta"
	| CollectionDocumentRefInclude;

/** Filters and optional content to include when reading one document. */
export type CollectionDocumentSingleQuery<
	TCollectionKey extends string = string,
> = {
	/** One filter object combines conditions with AND; an array combines filter groups with OR. */
	filter?: CollectionDocumentFilterInput<TCollectionKey>;
	/** Request bricks, metadata or shared references in the response. */
	include?: CollectionDocumentSingleInclude[];
};

/** Filters, sorting, includes and pagination for a document list. */
export type CollectionDocumentMultipleQuery<
	TCollectionKey extends string = string,
> = {
	/** One filter object combines conditions with AND; an array combines filter groups with OR. */
	filter?: CollectionDocumentFilterInput<TCollectionKey>;
	sort?: CollectionDocumentSorts<TCollectionKey>;
	/** Request bricks, metadata or shared references in the response. */
	include?: CollectionDocumentMultipleInclude[];
	/** One-based page number. */
	page?: QueryParamPagination["page"];
	/** Maximum documents per page. Use -1 for all matches. */
	perPage?: QueryParamPagination["perPage"];
};
