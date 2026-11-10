import type { FilterState, OrFilterGroups } from "@lucidcms/admin/hooks";
import type { PreviousPath } from "../../schema/previous-paths.js";

type FilterCondition = FilterState & { key: string };

const isEmpty = (value: FilterState["value"]) =>
	value === undefined ||
	value === "" ||
	(Array.isArray(value) && value.length === 0);

/** Whether a path passes one condition. Empty conditions pass everything. */
const matches = (path: PreviousPath, condition: FilterCondition) => {
	if (isEmpty(condition.value)) return true;

	const actual =
		condition.key === "locale"
			? path.locale
			: condition.key === "environment"
				? path.environment
				: undefined;
	const values = (
		Array.isArray(condition.value) ? condition.value : [condition.value]
	).map(String);
	const included = actual != null && values.includes(actual);
	return condition.operator === "!=" ? !included : included;
};

/**
 * Applies the drawer's filters to a page's previous paths as the API applies them to lists:
 * every top-level filter has to match, and so does at least one OR group when there are any.
 */
const filterPreviousPaths = (
	paths: PreviousPath[],
	filters: ReadonlyMap<string, FilterState>,
	groups: OrFilterGroups,
) =>
	paths.filter(
		(path) =>
			[...filters].every(([key, filter]) =>
				matches(path, { ...filter, key }),
			) &&
			(groups.length === 0 ||
				groups.some((group) =>
					group.every((condition) => matches(path, condition)),
				)),
	);

export default filterPreviousPaths;
