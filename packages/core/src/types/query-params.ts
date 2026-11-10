import type { FilterObject, SortDirection } from "@lucidcms/types";

export type {
	CollectionDocumentFilterInput,
	CollectionDocumentFilters,
	CollectionDocumentSortKey,
	CollectionDocumentSorts,
	CollectionDocumentVersion,
	CollectionDocumentVersionKey,
	ContentDocumentInclude,
	DefaultCollectionDocumentSortKey,
	DocumentFilters,
	DocumentListInput,
	DocumentReadInput,
	FilterCondition,
	FilterObject,
	FilterOperator,
	FilterValue,
	SortDirection,
} from "@lucidcms/types";

// -----------------------------------------------
// Filters
export type QueryParamFilters = Record<string, FilterObject>;
export type QueryParamFilterCondition = FilterObject & {
	key: string;
};
export type QueryParamFilterGroups = QueryParamFilterCondition[][];

// -----------------------------------------------
// Sorts
export type QueryParamSorts = Array<{
	key: string;
	direction: SortDirection;
}>;

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
