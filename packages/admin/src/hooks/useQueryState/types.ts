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

/** One filter condition inside a grouped OR branch. */
export interface OrFilterCondition extends FilterState {
	key: string;
}

/** Conditions inside a group are ANDed; groups are ORed. */
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
	singleSort?: boolean;
	//* ready() stays false until the first setSchema call - for screens whose
	//* filter schema is only known after data (eg. collection fields) has loaded
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
	//* reactive accessor for the current search string (no leading "?")
	search: () => string;
	write: (search: string) => void;
}

export type FilterMap = Map<string, FilterValue>;
export type FilterStateMap = Map<string, FilterState>;
export type OrFilterGroups = OrFilterGroup[];
export type SortMap = Map<string, SortDirection | undefined>;
