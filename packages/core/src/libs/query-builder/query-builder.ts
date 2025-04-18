import getTableKeyValue from "./utils/get-table-key-value.js";
import getFilterOperator from "./utils/get-filter-operator.js";
import type { QueryParams } from "../../types/query-params.js";
import type {
	SelectQueryBuilder,
	ReferenceExpression,
	ComparisonOperatorExpression,
} from "kysely";

const queryBuilder = <DB, Table extends keyof DB, O>(
	query: {
		main: SelectQueryBuilder<DB, Table, O>;
		count?: SelectQueryBuilder<
			DB,
			Table,
			{
				count: unknown;
			}
		>;
	},
	config: {
		queryParams: Partial<QueryParams>;
		meta?: {
			tableKeys?: {
				filters?: Record<string, ReferenceExpression<DB, Table>>;
				sorts?: Record<string, ReferenceExpression<DB, Table>>;
			};
			operators?: Record<string, ComparisonOperatorExpression | "%">;
		};
	},
) => {
	let mainQuery = query.main;
	let countQuery = query.count;

	// -----------------------------------------
	// Filters
	const filters = Object.entries(config.queryParams.filter || {});

	for (const [key, f] of filters) {
		const tableKey = getTableKeyValue<DB, Table>(
			key,
			config.meta?.tableKeys?.filters,
		);
		if (!tableKey) continue;

		const operator = getFilterOperator(key, f, config.meta?.operators);

		mainQuery = mainQuery.where(
			tableKey,
			operator as ComparisonOperatorExpression,
			f.value,
		);
		if (countQuery) {
			countQuery = countQuery.where(
				tableKey,
				operator as ComparisonOperatorExpression,
				f.value,
			);
		}
	}

	// -----------------------------------------
	// Sort
	if (config.queryParams.sort) {
		for (const sort of config.queryParams.sort) {
			const tableKey = getTableKeyValue<DB, Table>(
				sort.key,
				config.meta?.tableKeys?.sorts,
			);
			if (!tableKey) continue;
			mainQuery = mainQuery.orderBy(tableKey, sort.value);
		}
	}

	// -----------------------------------------
	// Pagination
	if (
		config.queryParams.perPage !== undefined &&
		config.queryParams.page !== undefined &&
		config.queryParams.perPage !== -1
	) {
		mainQuery = mainQuery
			.limit(config.queryParams.perPage)
			.offset((config.queryParams.page - 1) * config.queryParams.perPage);
	}

	return {
		main: mainQuery,
		count: countQuery,
	};
};

export default queryBuilder;
