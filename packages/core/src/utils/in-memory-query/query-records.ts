import compareValues from "./compare-values.js";
import matchesFilter from "./matches-filter.js";
import type { InMemoryQueryParams, InMemoryQueryResult } from "./types.js";

/** Filters, sorts and paginates records using Lucid's public query format. */
const queryRecords = <T>(
	params: InMemoryQueryParams<T>,
): InMemoryQueryResult<T> => {
	const filters = Object.entries(params.query.filter ?? {}).flatMap(
		([key, filter]) => {
			const field = params.fields[key];
			return field ? [{ field, filter }] : [];
		},
	);
	const filterOr = (params.query.filterOr ?? [])
		.map((group) =>
			group.flatMap((filter) => {
				const field = params.fields[filter.key];
				return field ? [{ field, filter }] : [];
			}),
		)
		.filter((group) => group.length > 0);

	let records = params.records.filter((record) => {
		const matchesAnd = filters.every(({ field, filter }) =>
			matchesFilter(field.get(record), filter, field.defaultOperator),
		);
		if (!matchesAnd) return false;
		if (filterOr.length === 0) return true;

		return filterOr.some((group) =>
			group.every(({ field, filter }) =>
				matchesFilter(field.get(record), filter, field.defaultOperator),
			),
		);
	});

	if (params.query.sort && params.query.sort.length > 0) {
		const sorts = params.query.sort.flatMap((sort) => {
			const field = params.fields[sort.key];
			return field ? [{ field, direction: sort.direction }] : [];
		});
		records = records
			.map((record, index) => ({ record, index }))
			.sort((left, right) => {
				for (const sort of sorts) {
					const leftValue = sort.field.get(left.record);
					const rightValue = sort.field.get(right.record);
					const comparison = compareValues(leftValue, rightValue);
					if (comparison !== 0) {
						return sort.direction === "desc" ? -comparison : comparison;
					}
				}
				return left.index - right.index;
			})
			.map(({ record }) => record);
	}

	const count = records.length;
	if (
		params.query.page !== undefined &&
		params.query.perPage !== undefined &&
		params.query.perPage !== -1
	) {
		const start = (params.query.page - 1) * params.query.perPage;
		records = records.slice(start, start + params.query.perPage);
	}

	return { data: records, count };
};

export default queryRecords;
