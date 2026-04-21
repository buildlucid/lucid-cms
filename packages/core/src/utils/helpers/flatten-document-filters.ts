import type {
	FilterObject,
	QueryFilters,
	QueryParamFilters,
} from "../../types/query-params.js";

/**
 * Detects Lucid's filter leaf shape so nested filter branches can be flattened safely.
 */
const isFilterObject = (value: unknown): value is FilterObject => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const keys = Object.keys(value);

	return (
		keys.length > 0 &&
		keys.every((key) => key === "value" || key === "operator") &&
		"value" in value
	);
};

/**
 * Recursively flattens nested filter objects into Lucid's dotted query key format.
 */
const flattenFilterBranch = (
	value: Record<string, unknown>,
	path: string[],
	flattened: QueryParamFilters,
) => {
	for (const [key, branchValue] of Object.entries(value)) {
		if (branchValue === undefined || branchValue === null) continue;

		if (isFilterObject(branchValue)) {
			flattened[[...path, key].join(".")] = branchValue;
			continue;
		}

		if (typeof branchValue === "object" && !Array.isArray(branchValue)) {
			flattenFilterBranch(
				branchValue as Record<string, unknown>,
				[...path, key],
				flattened,
			);
		}
	}
};

/**
 * Converts DX-friendly nested document filters into the flat internal query map.
 */
const flattenDocumentFilters = (
	filters?: QueryFilters,
): QueryParamFilters | undefined => {
	if (!filters) return undefined;

	const flattened: QueryParamFilters = {};

	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined || value === null) continue;

		if (isFilterObject(value)) {
			flattened[key] = value;
			continue;
		}

		if (typeof value === "object" && !Array.isArray(value)) {
			flattenFilterBranch(value as Record<string, unknown>, [key], flattened);
		}
	}

	return flattened;
};

export default flattenDocumentFilters;
