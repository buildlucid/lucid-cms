import z from "zod";
import { queryFormatted } from "../../schemas/helpers/querystring.js";

type FilterCondition = z.output<
	ReturnType<typeof queryFormatted.schema.filterOr.unwrap>
>[number][number];

/** Defines AND filter conditions, with enumerated or free-form keys, so models need not fill every filter property. */
export const filterConditionsInput = <Key extends z.ZodType<string>>(
	key: Key,
) =>
	z
		.array(
			queryFormatted.schema.filterOr.unwrap().element.element.extend({ key }),
		)
		.optional();

/** Places each key's first condition in `filter` for custom filters and adds repeats to every `filterOr` group. */
export const toQueryFilters = (
	conditions: FilterCondition[] = [],
	filterOr?: FilterCondition[][],
) => {
	const filter: Record<string, Omit<FilterCondition, "key">> = {};
	const repeated: FilterCondition[] = [];
	for (const { key, ...condition } of conditions) {
		if (Object.hasOwn(filter, key)) repeated.push({ key, ...condition });
		else filter[key] = condition;
	}

	return {
		filter: conditions.length > 0 ? filter : undefined,
		filterOr:
			repeated.length > 0
				? filterOr?.length
					? filterOr.map((group) => [...repeated, ...group])
					: [repeated]
				: filterOr,
	};
};
