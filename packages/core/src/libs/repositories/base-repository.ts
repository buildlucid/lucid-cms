import T from "../../translations/index.js";
import crypto from "node:crypto";
import logger from "../../utils/logging/index.js";
import constants from "../../constants/constants.js";
import { fromError } from "zod-validation-error";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import z, { type ZodSchema, type ZodObject } from "zod";
import {
	sql,
	type ColumnDataType,
	type ReferenceExpression,
	type ComparisonOperatorExpression,
	type InsertObject,
	type UpdateObject,
} from "kysely";
import type { LucidErrorData } from "../../types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { Select, Insert, Update, LucidDB, KyselyDB } from "../db/types.js";
import type { QueryParams } from "../../types/query-params.js";
import type {
	QueryResult,
	ValidationConfigExtend,
	QueryProps,
	ExecuteMeta,
} from "./types.js";

/**
 * The base repository class that all repositories should extend. This class provides basic CRUD operations for a single table.
 *
 * For tables that need more complex queries with joins or subqueries. Its expect you override the methods in this class while keeping the same paramaters if posible.
 *
 * @todo Any queryBuilder helper functions likley need to make use of the columnFormats config so they can correctly parse the data if needed. For ex if the where array includes an op on a boolean column, the value needs to be correctly formatted.
 * @todo Add callback support for the validation / tweak required. Sometimes instead of returning an error on required failing we want to handle it differently
 * @todo Improve validation error messages. Allow error overides for differnt types, required, validation etc.
 * @todo look into using $if for conditional query builder options
 * @todo try and get the retuning and select props correctly typed instead of typing it ourselved with the Select helper. Likley allows us to get rid of the 'as Promise<Pick<Select<T>, K> | undefined>' and lets Kysely handle the return type
 * @todo Support for DB Adapters overiding queries. Probs best as a method that repos can opt into?
 *
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
			filters?: Record<string, string>;
			sorts?: Record<string, string>;
		};
		operators?: Record<string, ComparisonOperatorExpression | "%">;
	};

	/**
	 * Formats values that need special handling (like JSON or booleans)
	 * Leaves other values and column names unchanged
	 */
	protected formatData<Type extends "insert" | "update">(
		data: Partial<Insert<T>> | Partial<Update<T>>,
		type: Type,
	): Type extends "insert"
		? InsertObject<LucidDB, Table>
		: UpdateObject<LucidDB, Table> {
		const formatted: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			const columnType = this.columnFormats[key as keyof T];
			formatted[key] = columnType
				? this.dbAdapter.formatInsertValue(columnType, value)
				: value;
		}

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return formatted as any;
	}
	/**
	 * Creates a validation schema based on selected columns
	 *
	 * - when selectAll is true, returns the full schema
	 * - when the select array is passed, picks only those columns from the schema
	 * - otherwise, makes all fields optional
	 */
	protected createValidationSchema<V extends boolean = false>(
		config: ValidationConfigExtend<V>,
	): ZodSchema {
		if (config.schema) {
			return this.wrapSchemaForMode(config.schema, config.mode);
		}

		let selectSchema: ZodSchema;
		if (config.selectAll) {
			selectSchema = this.tableSchema;
		} else if (Array.isArray(config.select) && config.select.length > 0) {
			selectSchema = this.tableSchema.pick(
				config.select.reduce<Record<string, true>>((acc, key) => {
					acc[key as string] = true;
					return acc;
				}, {}),
			);
		} else {
			selectSchema = this.tableSchema.partial();
		}

		return this.wrapSchemaForMode(selectSchema, config.mode);
	}
	/**
	 * Responsible for creating schemas based on the mode
	 */
	private wrapSchemaForMode(
		schema: ZodSchema,
		mode: "single" | "multiple" | "multiple-count" | "count",
	): ZodSchema {
		switch (mode) {
			case "count": {
				return z.object({ count: z.number() }).optional();
			}
			case "multiple-count":
				return z.tuple([
					z.array(schema),
					z.object({ count: z.number() }).optional(),
				]);
			case "multiple":
				return z.array(schema);
			case "single":
				return schema;
		}
	}
	/**
	 * Checks if the response data exists and successfully validates against a schema.
	 *
	 * Type narrows the response to not be undefined when the validation is enabled.
	 */
	protected async validateResponse<QueryData, V extends boolean = false>(
		executeResponse: Awaited<
			ReturnType<typeof this.executeQuery<QueryData | undefined>>
		>,
		config?: ValidationConfigExtend<V>,
	): Promise<QueryResult<QueryData, V>> {
		const res = executeResponse.response as QueryResult<QueryData, V>;

		if (config?.enabled !== true) return res;

		//* undefined and null checks
		if (res.data === undefined || res.data === null) {
			return {
				error: {
					...config.defaultError,
					status: config.defaultError?.status ?? 404,
				},
				data: undefined,
			};
		}

		const schema = this.createValidationSchema(config);
		if (!schema) return res;

		const validationResult = await schema.safeParseAsync(res.data);

		if (!validationResult.success) {
			const validationError = fromError(validationResult.error);
			logger("error", {
				message: validationError.toString(),
				scope: constants.logScopes.query,
				data: {
					id: executeResponse.meta.id,
					table: this.tableName,
					method: executeResponse.meta.method,
					executionTime: executeResponse.meta.executionTime,
				},
			});
			return {
				data: undefined,
				error: {
					...config?.defaultError,
					message: config?.defaultError?.message ?? T("validation_error"),
					type: config?.defaultError?.type ?? "validation",
					status: config?.defaultError?.status ?? 400,
				},
			};
		}

		return {
			data: res.data as NonNullable<QueryData>,
			error: undefined,
		};
	}
	/**
	 * Handles executing a query and logging
	 */
	protected async executeQuery<QueryData>(
		method: string,
		executeFn: () => Promise<QueryData>,
	): Promise<{
		response:
			| { error: LucidErrorData; data: undefined }
			| { error: undefined; data: QueryData };
		meta: ExecuteMeta;
	}> {
		const uuid = crypto.randomUUID();
		const startTime = process.hrtime();

		try {
			const result = await executeFn();

			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger("debug", {
				message: "Query execution completed",
				scope: constants.logScopes.query,
				data: {
					id: uuid,
					table: this.tableName,
					method: method,
					executionTime: `${executionTime}ms`,
				},
			});

			return {
				response: {
					data: result,
					error: undefined,
				},
				meta: {
					id: uuid,
					method: method,
					executionTime: `${executionTime}ms`,
				},
			};
		} catch (error) {
			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger("error", {
				message: "Query execution failed",
				scope: constants.logScopes.query,
				data: {
					id: uuid,
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
				response: {
					data: undefined,

					error: {
						message:
							error instanceof Error
								? error.message
								: T("an_unknown_error_occurred"),
						status: 500,
					},
				},
				meta: {
					id: uuid,
					method: method,
					executionTime: `${executionTime}ms`,
				},
			};
		}
	}

	// ----------------------------------------
	// Queries
	async count<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where?: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db
			.selectFrom(this.tableName)
			.select(sql`count(*)`.as("count"));

		if (props.where !== undefined && props.where.length > 0) {
			// @ts-expect-error
			query = queryBuilder.select(query, props.where);
		}

		const exec = await this.executeQuery(
			"count",
			() => query.executeTakeFirst() as Promise<{ count: string } | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "count",
		});
	}

	// ----------------------------------------
	// selects
	async selectSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				select: K[];
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		// @ts-expect-error
		let query = this.db.selectFrom(this.tableName).select(props.select);
		// @ts-expect-error
		query = queryBuilder.select(query, props.where);

		const exec = await this.executeQuery(
			"selectSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select as string[],
		});
	}
	async selectMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				select: K[];
				where?: QueryBuilderWhere<Table>;
				orderBy?: { column: K; direction: "asc" | "desc" }[];
				limit?: number;
				offset?: number;
			}
		>,
	) {
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

		const exec = await this.executeQuery(
			"selectMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.select as string[],
		});
	}
	async selectMultipleFiltered<
		K extends keyof Select<T>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				queryParams: Partial<QueryParams>;
			}
		>,
	) {
		const exec = await this.executeQuery("selectMultipleFiltered", async () => {
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

			const [mainResult, countResult] = await Promise.all([
				main.execute() as Promise<Pick<Select<T>, K>[]>,
				count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
			]);

			return [mainResult, countResult] as const;
		});

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: props.select as string[],
		});
	}

	// ----------------------------------------
	// deletes
	async deleteSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				returning?: K[];
				returnAll?: true;
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db.deleteFrom(this.tableName);

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);

		const exec = await this.executeQuery(
			"deleteSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
	async deleteMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				returning?: K[];
				returnAll?: true;
				where: QueryBuilderWhere<Table>;
			}
		>,
	) {
		let query = this.db.deleteFrom(this.tableName);

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		// @ts-expect-error
		query = queryBuilder.delete(query, props.where);

		const exec = await this.executeQuery(
			"deleteMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}

	// ----------------------------------------
	// creates
	async createSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<T>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.insertInto(this.tableName)
			.values(this.formatData(props.data, "insert"));

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		const exec = await this.executeQuery(
			"createSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
	async createMultiple<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<T>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.insertInto(this.tableName)
			.values(props.data.map((d) => this.formatData(d, "insert")));

		if (
			props.returnAll !== true &&
			props.returning &&
			props.returning.length > 0
		) {
			// @ts-expect-error
			query = query.returning(props.returning);
		}

		if (props.returnAll) {
			// @ts-expect-error
			query = query.returningAll();
		}

		const exec = await this.executeQuery(
			"createMultiple",
			() => query.execute() as Promise<Pick<Select<T>, K>[]>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}

	// ----------------------------------------
	// updates
	async updateSingle<K extends keyof Select<T>, V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: Partial<Update<T>>;
				where: QueryBuilderWhere<Table>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.updateTable(this.tableName)
			.set(this.formatData(props.data, "update"))
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				// @ts-expect-error
				(qb) => qb.returning(props.returning),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		// @ts-expect-error
		query = queryBuilder.update(query, props.where);

		const exec = await this.executeQuery(
			"updateSingle",
			() => query.executeTakeFirst() as Promise<Pick<Select<T>, K> | undefined>,
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
}

export default BaseRepository;
