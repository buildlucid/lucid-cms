import isRecord from "../utils/is-record.js";

type FilterGroup = Record<string, unknown>;

const normalizeGroup = (group: FilterGroup): FilterGroup =>
	Object.fromEntries(
		Object.entries(group).map(([key, value]) => {
			if (isRecord(value)) {
				return [key, "value" in value ? value : normalizeGroup(value)];
			}
			return [key, { value }];
		}),
	);

/** Wraps plain values in `{ value }`, preserves `{ value, operator }` filters and OR groups, and leaves casting to callers and validation to the toolkit. */
const normalizeFilter = (
	filter: unknown,
): FilterGroup | FilterGroup[] | undefined => {
	if (Array.isArray(filter)) return filter.filter(isRecord).map(normalizeGroup);
	if (isRecord(filter)) return normalizeGroup(filter);
	return undefined;
};

export default normalizeFilter;
