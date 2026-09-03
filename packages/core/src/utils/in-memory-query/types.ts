import type {
	FilterOperator,
	FilterValue,
	QueryParams,
} from "../../types/query-params.js";

export type InMemoryQueryValue = Exclude<FilterValue, unknown[]> | undefined;

export type InMemoryQueryField<T> = {
	get: (record: T) => InMemoryQueryValue;
	defaultOperator?: FilterOperator;
};

export type InMemoryQueryFields<T> = Record<string, InMemoryQueryField<T>>;

export type InMemoryQueryParams<T> = {
	records: T[];
	query: Partial<QueryParams>;
	fields: InMemoryQueryFields<T>;
};

export type InMemoryQueryResult<T> = {
	data: T[];
	count: number;
};
