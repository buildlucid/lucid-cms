import T from "../../translations/index.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { ZodObject } from "zod";
import type { LucidErrorData } from "../../types.js";
import {
	sql,
	type ColumnDataType,
	type ReferenceExpression,
	type ComparisonOperatorExpression,
} from "kysely";
import type DatabaseAdapter from "../db/adapter.js";
import type { Select, Insert, Update, LucidDB, KyselyDB } from "../db/types.js";
import type { QueryParams } from "../../types/query-params.js";
import logger from "../../utils/logging/index.js";
import constants from "../../constants/constants.js";

export type QueryResponse<T> = Promise<
	{ error: LucidErrorData; data: undefined } | { error: undefined; data: T }
>;

/**
 * The base repository class that all repositories should extend. This class provides basic CRUD operations for a single table.
 *
 * For tables that need more complex queries with joins or subqueries. Its expect you override the methods in this class while keeping the same paramaters if posible.
 *
 * @todo Implement validation
 * @todo Support for DB Adapters overiding queries. Probs best as a method that repos can opt into?
 * @todo Only implemented in the EmailsRepo class while testing it out. Will need to be fully implemented across all repositories.
 * @todo Add a solution for verifying if the Repos columnFormats are in sync with the database. This should be done via a test as opposed to runtime.
 */
abstract class BaseRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> {
	constructor(
		protected readonly db: KyselyDB,
		protected readonly dbAdapter: DatabaseAdapter,
		public readonly tableName: keyof LucidDB,
	) {}
	/**
	 * A Zod schema for the table.
	 */

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	protected abstract tableSchema: ZodObject<any>;
	/**
	 * The column data types for the table. Repositories need to keep these in sync with the migrations and the database.
	 */
	protected abstract columnFormats: Partial<Record<keyof T, ColumnDataType>>;
	/**
	 * The query configuration for the table. The main query builder fn uses this to map filter and sort query params to table columns, along with deciding which operators to use.
	 */
	protected abstract queryConfig?: {
		tableKeys?: {
			filters?: Record<string, ReferenceExpression<LucidDB, Table>>;
			sorts?: Record<string, ReferenceExpression<LucidDB, Table>>;
		};
		operators?: Record<string, ComparisonOperatorExpression | "%">;
	};

	/**
	 * Formats values that need special handling (like JSON or booleans)
	 * Leaves other values and column names unchanged
	 */
	protected formatData(data: Record<string, unknown>): Record<string, unknown> {
		const formatted: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			const columnType = this.columnFormats[key as keyof T];
			formatted[key] = columnType
				? this.dbAdapter.formatInsertValue(columnType, value)
				: value;
		}

		return formatted;
	}
	/**
	 * Wraps database operations with validation and error handling
	 */
	protected async executeQuery<QueryData>(
		method: string,
		queryFn: () => Promise<QueryData>,
	): QueryResponse<QueryData> {
		const startTime = process.hrtime();

		try {
			const result = await queryFn();

			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger("debug", {
				message: "Query execution completed",
				scope: constants.logScopes.query,
				data: {
					table: this.tableName,
					method: method,
					executionTime: `${executionTime}ms`,
				},
			});

			return { data: result, error: undefined };
		} catch (error) {
			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger("error", {
				message: "Query execution failed",
				scope: constants.logScopes.query,
				data: {
					table: this.tableName,
					method: method,
					executionTime: `${executionTime}ms`,
					errorMessage:
						error instanceof Error
							? error.message
							: T("an_unknown_error_occurred"),
				},
			});

			return {
				data: undefined,
				error: {
					message:
						error instanceof Error
							? error.message
							: T("an_unknown_error_occurred"),
					status: 500,
				},
			};
		}
	}

	// ----------------------------------------
	// selects
	async selectSingle<K extends keyof Select<T>>(props: {
		select: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		return this.executeQuery("selectSingle", async () => {
			// @ts-expect-error
			let query = this.db.selectFrom(this.tableName).select(props.select);
			// @ts-expect-error
			query = queryBuilder.select(query, props.where);
			return query.executeTakeFirst() as Promise<
				Pick<Select<T>, K> | undefined
			>;
		});
	}
	async selectMultiple<K extends keyof Select<T>>(props: {
		select: K[];
		where?: QueryBuilderWhere<Table>;
		orderBy?: { column: K; direction: "asc" | "desc" }[];
		limit?: number;
		offset?: number;
	}) {
		return this.executeQuery("selectMultiple", async () => {
			// @ts-expect-error
			let query = this.db.selectFrom(this.tableName).select(props.select);

			if (props.where) {
				// @ts-expect-error
				query = queryBuilder.select(query, props.where);
			}

			if (props.orderBy) {
				for (const order of props.orderBy) {
					query = query.orderBy(order.column as string, order.direction);
				}
			}

			if (props.limit) {
				query = query.limit(props.limit);
			}

			if (props.offset) {
				query = query.offset(props.offset);
			}

			return query.execute() as Promise<Pick<Select<T>, K>[]>;
		});
	}
	async selectMultipleFiltered<K extends keyof Select<T>>(props: {
		select: K[];
		queryParams: Partial<QueryParams>;
	}) {
		return this.executeQuery("selectMultipleFiltered", async () => {
			const mainQuery = this.db
				.selectFrom(this.tableName)
				// @ts-expect-error
				.select(props.select);

			const countQuery = this.db
				.selectFrom(this.tableName)
				.select(sql`count(*)`.as("count"));

			const { main, count } = queryBuilder.main(
				{
					main: mainQuery,
					count: countQuery,
				},
				{
					queryParams: props.queryParams,
					// @ts-expect-error
					meta: this.queryConfig,
				},
			);

			const res = await Promise.all([
				main.execute() as Promise<Pick<Select<T>, K>[]>,
				count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
			]);

			return {
				main: res[0],
				count: res[1],
			};
		});
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>>(props: {
		returning?: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		return this.executeQuery("deleteSingle", async () => {
			let query = this.db.deleteFrom(this.tableName);
			if (props.returning && props.returning.length > 0) {
				// @ts-expect-error
				query = query.returning(props.returning);
			}
			// @ts-expect-error
			query = queryBuilder.delete(query, props.where);
			return query.executeTakeFirst() as Promise<
				Pick<Select<T>, K> | undefined
			>;
		});
	}
	async deleteMultiple<K extends keyof Select<T>>(props: {
		returning?: K[];
		where: QueryBuilderWhere<Table>;
	}) {
		return this.executeQuery("deleteMultiple", async () => {
			let query = this.db.deleteFrom(this.tableName);
			if (props.returning && props.returning.length > 0) {
				// @ts-expect-error
				query = query.returning(props.returning);
			}
			// @ts-expect-error
			query = queryBuilder.delete(query, props.where);
			return query.execute() as Promise<Pick<Select<T>, K>[]>;
		});
	}

	// ----------------------------------------
	// creates
	async createSingle<K extends keyof Select<T>>(props: {
		data: Partial<Insert<T>>;
		returning?: K[];
		returnAll?: boolean;
	}) {
		return this.executeQuery("createSingle", async () => {
			let query = this.db
				.insertInto(this.tableName)
				.values(this.formatData(props.data));
			if (
				props.returning &&
				props.returning.length > 0 &&
				props.returnAll !== true
			) {
				// @ts-expect-error
				query = query.returning(props.returning);
			}
			if (props.returnAll === true) {
				// @ts-expect-error
				query = query.returningAll();
			}
			return query.executeTakeFirst() as Promise<
				Pick<Select<T>, K> | undefined
			>;
		});
	}
	async createMultiple<K extends keyof Select<T>>(props: {
		data: Partial<Insert<T>>[];
		returning?: K[];
		returnAll?: boolean;
	}) {
		return this.executeQuery("createMultiple", async () => {
			let query = this.db
				.insertInto(this.tableName)
				.values(props.data.map(this.formatData));

			if (
				props.returning &&
				props.returning.length > 0 &&
				props.returnAll !== true
			) {
				// @ts-expect-error
				query = query.returning(props.returning);
			}
			if (props.returnAll === true) {
				// @ts-expect-error
				query = query.returningAll();
			}

			return query.execute() as Promise<Pick<Select<T>, K>[]>;
		});
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>>(props: {
		data: Partial<Update<T>>;
		where: QueryBuilderWhere<Table>;
		returning?: K[];
		returnAll?: boolean;
	}) {
		return this.executeQuery("updateSingle", async () => {
			let query = this.db
				.updateTable(this.tableName)
				.set(this.formatData(props.data));

			if (
				props.returning &&
				props.returning.length > 0 &&
				props.returnAll !== true
			) {
				// @ts-expect-error
				query = query.returning(props.returning);
			}
			if (props.returnAll === true) {
				// @ts-expect-error
				query = query.returningAll();
			}

			// @ts-expect-error
			query = queryBuilder.update(query, props.where);

			return query.executeTakeFirst() as Promise<
				Pick<Select<T>, K> | undefined
			>;
		});
	}
}

export default BaseRepository;
