import type { QueryParamFilters } from "../../types/query-params.js";

/**
 * Applies default query filters without overriding caller-provided values.
 */
const applyDefaultQueryFilters = (
	filters: Record<string, unknown> | undefined,
	defaults: QueryParamFilters,
): QueryParamFilters => {
	const mergedFilters = { ...(filters ?? {}) } as QueryParamFilters;

	for (const [key, value] of Object.entries(defaults)) {
		if (mergedFilters[key] === undefined) {
			mergedFilters[key] = value;
		}
	}

	return mergedFilters;
};

export default applyDefaultQueryFilters;
