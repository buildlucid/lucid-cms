import type { ComparisonOperatorExpression } from "kysely";
import type { DocumentVersionType } from "../libs/db-adapter/types.js";

// -----------------------------------------------
// Filters
export type FilterValue =
	| string
	| Array<string>
	| number
	| Array<number>
	| null;
export type FilterOperator = ComparisonOperatorExpression | "%";
export type FilterObject = {
	value: FilterValue;
	operator?: FilterOperator;
};
export type QueryParamFilters = Record<string, FilterObject>;
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

// -----------------------------------------------
// Sorts
export type SortValue = "asc" | "desc";
export type QueryParamSorts = Array<{
	key: string;
	value: SortValue;
}>;

export type DefaultCollectionDocumentSortKey = "createdAt" | "updatedAt";

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
		value: SortValue;
	}>;

// -----------------------------------------------
// Statuses
export type DefaultCollectionDocumentStatus = DocumentVersionType;
export type DefaultCollectionDocumentVersionKey = string;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentStatusesByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionKeysByCollection {}

type CollectionDocumentStatusCollectionKey = Extract<
	keyof CollectionDocumentStatusesByCollection,
	string
>;

type CollectionDocumentVersionKeyCollectionKey = Extract<
	keyof CollectionDocumentVersionKeysByCollection,
	string
>;

export type CollectionDocumentStatus<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentStatusCollectionKey
		? CollectionDocumentStatusesByCollection[TCollectionKey]
		: DefaultCollectionDocumentStatus;

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
	sort: QueryParamSorts | undefined;
	include: QueryParamIncludes | undefined;
	exclude: QueryParamExcludes | undefined;
	page: QueryParamPagination["page"];
	perPage: QueryParamPagination["perPage"];
};

export type CollectionDocumentSingleQuery<
	TCollectionKey extends string = string,
> = {
	filter?: CollectionDocumentFilters<TCollectionKey>;
	include?: Array<"bricks">;
};

export type CollectionDocumentMultipleQuery<
	TCollectionKey extends string = string,
> = {
	filter?: CollectionDocumentFilters<TCollectionKey>;
	sort?: CollectionDocumentSorts<TCollectionKey>;
	page?: QueryParamPagination["page"];
	perPage?: QueryParamPagination["perPage"];
};
