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

/** Wraps plain values in `{ value }`, preserves `{ value, operator }` filters, and treats group lists as OR conditions for toolkit validation. */
const normalizeFilter = <Filter>(filter: unknown): Filter | undefined => {
	if (Array.isArray(filter)) {
		return filter.filter(isRecord).map(normalizeGroup) as Filter;
	}
	if (isRecord(filter)) return normalizeGroup(filter) as Filter;
	return undefined;
};

export default normalizeFilter;
