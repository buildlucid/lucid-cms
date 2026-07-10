import type {
	ExpressionBuilder,
	OperandExpression,
	ReferenceExpression,
	SelectQueryBuilder,
	SqlBool,
} from "kysely";
import type {
	FilterObject,
	FilterOperator,
	QueryParamFilterCondition,
	QueryParams,
} from "../../../types/query-params.js";
import type { DatabaseConfig } from "../types.js";
import compileFilterExpression from "./utils/compile-filter-expression.js";
import getFilterOperator from "./utils/get-filter-operator.js";
import getTableKeyValue from "./utils/get-table-key-value.js";

type CustomFilterHandler<DB, Table extends keyof DB> = (params: {
	eb: ExpressionBuilder<DB, Table>;
	filter: QueryParamFilterCondition;
}) => OperandExpression<SqlBool> | undefined;

type QueryBuilderMeta<DB, Table extends keyof DB> = {
	tableKeys?: {
		filters?: Record<string, ReferenceExpression<DB, Table>>;
		sorts?: Record<string, ReferenceExpression<DB, Table>>;
	};
	operators?: Record<string, FilterOperator>;
	customFilters?: Record<string, CustomFilterHandler<DB, Table>>;
};

type MappedFilterOrCondition<DB, Table extends keyof DB> =
	| {
			type: "custom";
			customFilter: CustomFilterHandler<DB, Table>;
			filter: QueryParamFilterCondition;
	  }
	| {
			type: "mapped";
			condition: NonNullable<ReturnType<typeof conditionFromFilter<DB, Table>>>;
	  };

/** Maps public filter keys to table expressions, ignoring unknown keys. */
const conditionFromFilter = <DB, Table extends keyof DB>(
	key: string,
	filter: FilterObject,
	meta?: QueryBuilderMeta<DB, Table>,
):
	| {
			key: ReferenceExpression<DB, Table>;
			filter: FilterObject & { operator: FilterOperator };
	  }
	| undefined => {
	const tableKey = getTableKeyValue<DB, Table>(key, meta?.tableKeys?.filters);
	if (!tableKey) return undefined;

	return {
		key: tableKey,
		filter: {
			...filter,
			operator: getFilterOperator(key, filter, meta?.operators),
		},
	};
};

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
		database: Pick<DatabaseConfig, "caseInsensitiveLikeOperator">;
		meta?: QueryBuilderMeta<DB, Table>;
	},
) => {
	let mainQuery = query.main;
	let countQuery = query.count;

	// -----------------------------------------
	// Filters
	const filters = Object.entries(config.queryParams.filter || {});

	for (const [key, f] of filters) {
		const customFilter = config.meta?.customFilters?.[key];
		if (customFilter) {
			mainQuery = mainQuery.where(
				(eb) =>
					customFilter({
						eb,
						filter: { key, ...f },
					}) ?? eb.val(true),
			);
			if (countQuery) {
				countQuery = countQuery.where(
					(eb) =>
						customFilter({
							eb,
							filter: { key, ...f },
						}) ?? eb.val(true),
				);
			}
			continue;
		}

		const condition = conditionFromFilter<DB, Table>(key, f, config.meta);
		if (!condition) continue;

		mainQuery = mainQuery.where((eb) =>
			compileFilterExpression({
				eb,
				reference: condition.key,
				filter: condition.filter,
				caseInsensitiveLikeOperator:
					config.database.caseInsensitiveLikeOperator,
			}),
		);
		if (countQuery) {
			countQuery = countQuery.where((eb) =>
				compileFilterExpression({
					eb,
					reference: condition.key,
					filter: condition.filter,
					caseInsensitiveLikeOperator:
						config.database.caseInsensitiveLikeOperator,
				}),
			);
		}
	}

	const filterOrGroups = config.queryParams.filterOr || [];
	const mappedFilterOrGroups = filterOrGroups
		.map((group) =>
			group
				.map((filter) => {
					const customFilter = config.meta?.customFilters?.[filter.key];
					if (customFilter) {
						return {
							type: "custom",
							customFilter,
							filter,
						} satisfies MappedFilterOrCondition<DB, Table>;
					}

					const condition = conditionFromFilter<DB, Table>(
						filter.key,
						filter,
						config.meta,
					);
					if (!condition) return undefined;

					return {
						type: "mapped",
						condition,
					} satisfies MappedFilterOrCondition<DB, Table>;
				})
				.filter((filter): filter is NonNullable<typeof filter> =>
					Boolean(filter),
				),
		)
		.filter((group) => group.length > 0);

	if (mappedFilterOrGroups.length > 0) {
		/** Applies OR groups as a single ANDed predicate on the current query. */
		const applyFilterOr = <Output>(qb: SelectQueryBuilder<DB, Table, Output>) =>
			qb.where((eb) => {
				const groupExpressions: OperandExpression<SqlBool>[] = [];

				for (const group of mappedFilterOrGroups) {
					const expressions: OperandExpression<SqlBool>[] = [];

					for (const filter of group) {
						if (filter.type === "custom") {
							const expression = filter.customFilter({
								eb,
								filter: filter.filter,
							});
							if (expression !== undefined) expressions.push(expression);
							continue;
						}

						expressions.push(
							compileFilterExpression({
								eb,
								reference: filter.condition.key,
								filter: filter.condition.filter,
								caseInsensitiveLikeOperator:
									config.database.caseInsensitiveLikeOperator,
							}),
						);
					}

					if (expressions.length > 0) {
						groupExpressions.push(eb.and(expressions));
					}
				}

				return groupExpressions.length > 0
					? eb.or(groupExpressions)
					: eb.val(true);
			});

		mainQuery = applyFilterOr(mainQuery);
		if (countQuery) countQuery = applyFilterOr(countQuery);
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
			mainQuery = mainQuery.orderBy(tableKey, sort.direction);
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
