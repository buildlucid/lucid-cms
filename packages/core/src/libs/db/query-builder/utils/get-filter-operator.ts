import type {
	FilterObject,
	FilterOperator,
} from "../../../../types/query-params.js";

const getFilterOperator = (
	key: string,
	f: FilterObject,
	operators?: Record<string, FilterOperator>,
): FilterOperator => {
	if (f.operator !== undefined) return f.operator;
	if (Array.isArray(f.value)) return "in";
	if (f.value === null) return "is";
	return operators?.[key] || "=";
};

export default getFilterOperator;
