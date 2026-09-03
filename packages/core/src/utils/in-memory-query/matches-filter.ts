import type { FilterObject } from "../../types/query-params.js";
import compareValues from "./compare-values.js";
import type { InMemoryQueryValue } from "./types.js";

const matchesTextFilter = (
	value: InMemoryQueryValue,
	queryValue: FilterObject["value"],
	operator: NonNullable<FilterObject["operator"]>,
) => {
	const text = String(value ?? "").toLocaleLowerCase();
	const expected = String(queryValue ?? "").toLocaleLowerCase();
	const matches = operator.endsWith("contains")
		? text.includes(expected)
		: operator.endsWith("starts-with")
			? text.startsWith(expected)
			: text.endsWith(expected);

	return operator.startsWith("not-") ? !matches : matches;
};

/** Applies one public query filter to an in-memory primitive value. */
const matchesFilter = (
	value: InMemoryQueryValue,
	filter: FilterObject,
	defaultOperator?: FilterObject["operator"],
): boolean => {
	const operator =
		filter.operator ??
		(Array.isArray(filter.value)
			? "in"
			: filter.value === null
				? "is"
				: (defaultOperator ?? "="));

	if (
		operator === "contains" ||
		operator === "not-contains" ||
		operator === "starts-with" ||
		operator === "not-starts-with" ||
		operator === "ends-with" ||
		operator === "not-ends-with"
	) {
		return matchesTextFilter(value, filter.value, operator);
	}

	if (operator === "in" || operator === "not-in") {
		const values = Array.isArray(filter.value) ? filter.value : [filter.value];
		const includes = values.some(
			(queryValue) => compareValues(value, queryValue) === 0,
		);
		return operator === "not-in" ? !includes : includes;
	}

	const comparison = compareValues(value, filter.value);
	switch (operator) {
		case "=":
		case "is":
			return comparison === 0;
		case "!=":
		case "is-not":
			return comparison !== 0;
		case ">":
			return comparison > 0;
		case ">=":
			return comparison >= 0;
		case "<":
			return comparison < 0;
		case "<=":
			return comparison <= 0;
	}
};

export default matchesFilter;
