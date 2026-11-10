import type {
	FilterObject,
	FilterOperator,
	FilterValue,
} from "@lucidcms/types";

/** One condition with its dotted key, such as `fields.title` or `bricks.hero.heading`. */
export type FlatFilterCondition = FilterObject & { key: string };

/** What a filter object's keys mean at one level: field keys, brick keys or a related document. */
type FilterLevel = "root" | "fields" | "bricks" | "relation" | "group";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isFilterValue = (value: unknown): value is FilterValue =>
	value === null ||
	Array.isArray(value) ||
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean";

const isFilterObject = (value: unknown): value is FilterObject =>
	isRecord(value) &&
	"value" in value &&
	isFilterValue(value.value) &&
	Object.keys(value).every((key) => key === "value" || key === "operator");

/** Arrays match with `in` and null with `is` unless an operator says otherwise. */
const defaultOperator = (value: FilterValue): FilterOperator | undefined => {
	if (Array.isArray(value)) {
		return "in";
	}
	if (value === null) {
		return "is";
	}
	return undefined;
};

const toCondition = (
	key: string,
	condition: FilterValue | FilterObject,
): FlatFilterCondition => {
	const filter = isFilterObject(condition) ? condition : { value: condition };
	const operator = filter.operator ?? defaultOperator(filter.value);

	return operator === undefined
		? { key, value: filter.value }
		: { key, value: filter.value, operator };
};

/** The level a key's object value opens. Bricks always hold field keys, so a field keyed `value` stays a field. */
const childLevel = (level: FilterLevel, key: string): FilterLevel => {
	if (level === "bricks") {
		return "fields";
	}
	if (level === "root" || level === "relation") {
		if (key === "fields" || key === "bricks") {
			return key;
		}
		return level === "root" ? "group" : "relation";
	}
	return level === "fields" ? "relation" : "group";
};

const flattenLevel = (
	filters: Record<string, unknown>,
	level: FilterLevel,
	path: string[],
	conditions: FlatFilterCondition[],
) => {
	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined) {
			continue;
		}

		const next = childLevel(level, key);
		const opensLevel = next === "fields" || next === "bricks";
		if (isRecord(value) && (opensLevel || !isFilterObject(value))) {
			flattenLevel(value, next, [...path, key], conditions);
			continue;
		}
		if (isFilterValue(value) || isFilterObject(value)) {
			conditions.push(toCondition([...path, key].join("."), value));
		}
	}
};

/**
 * Flattens one filter object into conditions with dotted keys, which the client sends as
 * `filter[key:operator]` and the server filters by. Plain values become equality conditions.
 *
 * @example
 * ```ts
 * flattenFilters({ id: 1, fields: { title: { value: "News", operator: "starts-with" } } });
 * // [{ key: "id", value: 1 }, { key: "fields.title", value: "News", operator: "starts-with" }]
 * ```
 */
const flattenFilters = (
	filters: Record<string, unknown> | undefined,
): FlatFilterCondition[] => {
	const conditions: FlatFilterCondition[] = [];
	if (filters) {
		flattenLevel(filters, "root", [], conditions);
	}
	return conditions;
};

export default flattenFilters;
