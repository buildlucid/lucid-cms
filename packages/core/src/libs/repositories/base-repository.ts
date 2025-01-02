import T from "../../translations/index.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import z, { type ZodSchema, type ZodObject } from "zod";
import { fromError } from "zod-validation-error";
import type { ServiceResponse, LucidErrorData } from "../../types.js";
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

type QueryMethodProps<T> = {
	/**
	 * Custom schema to override the default table schema
	 */
	schema?: ZodSchema;
	/**
	 * Whether to run validation on the response
	 */
	validateResponse?: boolean;
	/**
	 * Require the response to exist (not undefined/null)
	 * Will return an error if the response is undefined/null
	 */
	required?: boolean;
	/**
	 * Custom error to return when validation fails
	 */
	validationError?: LucidErrorData;
} & T;

/**
 * The base repository class that all repositories should extend. This class provides basic CRUD operations for a single table.
 *
 * For tables that need more complex queries with joins or subqueries. Its expect you override the methods in this class while keeping the same paramaters if posible.
 *
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
	 * A helper that creates a partial zod schema based on selected columns.
	 */
	protected createSelectSchema<K extends keyof Select<T>>(select: K[]) {
		return this.tableSchema.pick(
			select.reduce<Record<string, true>>((acc, key) => {
				acc[key as string] = true;
				return acc;
			}, {}),
		);
	}
	/**
	 * Creates a validation schema based on selected columns.
	 * Can be overridden by specific repositories for custom validation logic.
	 */
	protected createValidationSchema<K extends keyof Select<T>>(
		select: K[],
		mode: "single" | "multiple" | "multiple-count",
		overrideSchema?: ZodSchema,
	): ZodSchema {
		if (overrideSchema) {
			return mode === "multiple-count"
				? z.tuple([
						z.array(overrideSchema),
						z.object({ count: z.number() }).optional(),
					])
				: mode === "single"
					? overrideSchema
					: z.array(overrideSchema);
		}

		const selectSchema = this.createSelectSchema(select);
		return mode === "multiple-count"
			? z.tuple([
					z.array(selectSchema),
					z.object({ count: z.number() }).optional(),
				])
			: mode === "single"
				? selectSchema
				: z.array(selectSchema);
	}
	/**
	 * Wraps database operations with validation and error handling
	 */
	protected async executeQuery<Result>(
		queryFn: () => Promise<Result>,
		options: {
			schema?: ZodSchema;
			mode: "single" | "multiple" | "multiple-count";
			method: string;
			validateResponse?: boolean;
			select?: Array<keyof Select<T>>;
			required?: boolean;
			validationError?: LucidErrorData;
		},
	): ServiceResponse<Result> {
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
					method: options.method,
					mode: options.mode,
					executionTime: `${executionTime}ms`,
					select: options.select,
					hasValidation:
						options.validateResponse !== false &&
						(!!options.schema || !!options.select),
					required: options.required,
				},
			});

			//* checks for undefined or null
			if (options.required && (result === undefined || result === null)) {
				return {
					data: undefined,
					error: {
						message: options.validationError?.message,
						type: options.validationError?.type,
						status: options.validationError?.status ?? 404,
					},
				};
			}

			//* skips validation if validateResponse is false or no schema or select is provided
			if (
				options.validateResponse === false ||
				(!options.schema && !options.select)
			) {
				return { data: result, error: undefined };
			}

			const validationSchema =
				options.schema ||
				(options.select &&
					this.createValidationSchema(options.select, options.mode));

			if (!validationSchema) {
				return { data: result, error: undefined };
			}

			const validationResult = await validationSchema.safeParseAsync(result);

			if (!validationResult.success) {
				const validationError = fromError(validationResult.error);
				logger("error", {
					message: validationError.toString(),
					scope: constants.logScopes.query,
					data: {
						table: this.tableName,
						method: options.method,
						executionTime: `${executionTime}ms`,
					},
				});
				return {
					data: undefined,
					error: {
						message: options.validationError?.message ?? T("validation_error"),
						type: options.validationError?.type ?? "validation",
						status: options.validationError?.status ?? 400,
					},
				};
			}

			return { data: validationResult.data as Result, error: undefined };
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
					method: options.method,
					executionTime: `${executionTime}ms`,
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				},
			});

			return {
				data: undefined,
				error: {
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
					status: 500,
				},
			};
		}
	}

	// ----------------------------------------
	// selects
	async selectSingle<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			select: K[];
			where: QueryBuilderWhere<Table>;
		}>,
	): ServiceResponse<Pick<Select<T>, K> | undefined> {
		return this.executeQuery(
			async () => {
				// @ts-expect-error
				let query = this.db.selectFrom(this.tableName).select(props.select);
				// @ts-expect-error
				query = queryBuilder.select(query, props.where);
				return query.executeTakeFirst() as Promise<
					Pick<Select<T>, K> | undefined
				>;
			},
			{
				method: "selectSingle",
				mode: "single",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.select,
			},
		);
	}
	async selectMultiple<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			select: K[];
			where?: QueryBuilderWhere<Table>;
			orderBy?: { column: K; direction: "asc" | "desc" }[];
			limit?: number;
			offset?: number;
		}>,
	): ServiceResponse<Pick<Select<T>, K>[]> {
		return this.executeQuery(
			async () => {
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
			},
			{
				method: "selectMultiple",
				mode: "multiple",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.select,
			},
		);
	}
	async selectMultipleFiltered<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			select: K[];
			queryParams: Partial<QueryParams>;
		}>,
	): ServiceResponse<[Pick<Select<T>, K>[], { count: string } | undefined]> {
		return this.executeQuery(
			async () => {
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

				return Promise.all([
					main.execute() as Promise<Pick<Select<T>, K>[]>,
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);
			},
			{
				method: "selectMultipleFiltered",
				mode: "multiple-count",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.select,
			},
		);
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			returning?: K[];
			where: QueryBuilderWhere<Table>;
		}>,
	): ServiceResponse<Pick<Select<T>, K> | undefined> {
		return this.executeQuery(
			async () => {
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
			},
			{
				method: "deleteSingle",
				mode: "single",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.returning,
			},
		);
	}
	async deleteMultiple<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			returning?: K[];
			where: QueryBuilderWhere<Table>;
		}>,
	): ServiceResponse<Pick<Select<T>, K>[]> {
		return this.executeQuery(
			async () => {
				let query = this.db.deleteFrom(this.tableName);
				if (props.returning && props.returning.length > 0) {
					// @ts-expect-error
					query = query.returning(props.returning);
				}
				// @ts-expect-error
				query = queryBuilder.delete(query, props.where);
				return query.execute() as Promise<Pick<Select<T>, K>[]>;
			},
			{
				method: "deleteMultiple",
				mode: "multiple",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.returning,
			},
		);
	}

	// ----------------------------------------
	// creates
	async createSingle<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			data: Partial<Insert<T>>;
			returning?: K[];
			returnAll?: boolean;
		}>,
	): ServiceResponse<Pick<Select<T>, K> | undefined> {
		return this.executeQuery(
			async () => {
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
			},
			{
				method: "createSingle",
				mode: "single",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.returning,
			},
		);
	}
	async createMultiple<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			data: Partial<Insert<T>>[];
			returning?: K[];
			returnAll?: boolean;
		}>,
	): ServiceResponse<Pick<Select<T>, K>[]> {
		return this.executeQuery(
			async () => {
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
			},
			{
				method: "createMultiple",
				mode: "multiple",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.returning,
			},
		);
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>>(
		props: QueryMethodProps<{
			data: Partial<Update<T>>;
			where: QueryBuilderWhere<Table>;
			returning?: K[];
			returnAll?: boolean;
		}>,
	): ServiceResponse<Pick<Select<T>, K> | undefined> {
		return this.executeQuery(
			async () => {
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
			},
			{
				method: "updateSingle",
				mode: "single",
				schema: props.schema,
				validateResponse: props.validateResponse,
				select: props.returning,
			},
		);
	}
}

export default BaseRepository;
