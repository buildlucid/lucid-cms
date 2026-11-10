import type z from "zod";
import type { ZodType } from "zod";
import type { QueryParamFilterGroups } from "../../../types/query-params.js";

/** Validates the query and each OR group against the same filter schema, rejecting unknown keys. */
const parseFormattedQuery = async <T extends ZodType>(
	schema: T,
	query: { filterOr?: QueryParamFilterGroups },
): Promise<z.ZodSafeParseResult<z.infer<T>>> => {
	for (const group of query.filterOr ?? []) {
		const groupResult = await schema.safeParseAsync({
			...query,
			filter: Object.fromEntries(
				group.map(({ key, ...filter }) => [key, filter]),
			),
		});
		if (!groupResult.success) {
			return groupResult;
		}
	}

	return schema.safeParseAsync(query);
};

export default parseFormattedQuery;
