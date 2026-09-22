export type FilterValue =
	| string
	| number
	| boolean
	| (string | number)[]
	| undefined;

export type SortDirection = "asc" | "desc";

export type FilterType = "text" | "number" | "boolean" | "array";

export interface FilterCodec {
	kind: "filter";
	type: FilterType;
	defaultValue: FilterValue;
	defaultOperator?: string;
	parse: (raw: string) => FilterValue;
	serialize: (value: FilterValue) => string | undefined;
	isEmpty: (value: FilterValue) => boolean;
	equals: (a: FilterValue, b: FilterValue) => boolean;
	normalize: (value: FilterValue) => FilterValue;
}

export interface SortCodec {
	kind: "sort";
	defaultValue: SortDirection | undefined;
}

export interface PaginationCodec {
	kind: "pagination";
	defaultPage: number;
	defaultPerPage: number;
}

export type QueryFilterSchema = Record<string, FilterCodec>;
export type QuerySortSchema = Record<string, SortCodec>;

export interface QueryStateSchema {
	filters?: QueryFilterSchema;
	defaultOrFilterGroups?: OrFilterGroup[];
	sorts?: QuerySortSchema;
	pagination?: PaginationCodec;
}

export interface FilterState {
	value: FilterValue;
	operator?: string;
}

export interface QueryFilterState extends FilterState {
	operatorExplicit?: boolean;
}

export interface OrFilterCondition extends FilterState {
	key: string;
}

/** All conditions in a group must match. A result can match any group. */
export type OrFilterGroup = OrFilterCondition[];

export interface QueryStateModel {
	filters: Record<string, QueryFilterState>;
	orFilterGroups: OrFilterGroup[];
	sorts: Record<string, SortDirection | undefined>;
	pagination: {
		page: number;
		perPage: number;
	};
}

export interface QueryStateOptions {
	/** Only allows sorting by one key at a time. */
	singleSort?: boolean;
	/** Keeps `ready()` false until `setSchema` is called, for schemas that depend on loaded data. */
	awaitSchema?: boolean;
}

export interface QueryStateParams {
	filters?: Record<string, FilterValue | FilterState>;
	orFilterGroups?: OrFilterGroup[];
	sorts?: Record<string, SortDirection | undefined>;
	pagination?: {
		page?: number;
		perPage?: number;
	};
}

export interface QueryStateStorageAdapter {
	//* the current search string, without the leading "?"
	search: () => string;
	write: (search: string) => void;
}

export type FilterMap = Map<string, FilterValue>;
export type FilterStateMap = Map<string, FilterState>;
export type OrFilterGroups = OrFilterGroup[];
export type SortMap = Map<string, SortDirection | undefined>;
