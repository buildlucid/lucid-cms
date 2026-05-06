import type { FilterObject } from "../../types/query-params.js";

/**
 * Normalizes a query filter into non-null scalar values for manual SQL filters.
 */
const getFilterValues = (
	filter: FilterObject | undefined,
): Array<string | number> | undefined => {
	if (filter === undefined) return undefined;

	const values = Array.isArray(filter.value) ? filter.value : [filter.value];

	return values.filter((value): value is string | number => value !== null);
};

export default getFilterValues;
