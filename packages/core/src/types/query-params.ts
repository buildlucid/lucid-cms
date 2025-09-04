import type { ComparisonOperatorExpression } from "kysely";

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

// -----------------------------------------------
// Sorts
export type SortValue = "asc" | "desc";
export type QueryParamSorts = Array<{
	key: string;
	value: SortValue;
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
	sort: QueryParamSorts | undefined;
	include: QueryParamIncludes | undefined;
	exclude: QueryParamExcludes | undefined;
	page: QueryParamPagination["page"];
	perPage: QueryParamPagination["perPage"];
};
