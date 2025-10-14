import T from "../../../translations/index.js";
import logger from "../../logger/index.js";
import constants from "../../../constants/constants.js";
import { tidyZodError } from "../../../utils/errors/index.js";
import z, { type ZodType, type ZodObject } from "zod/v4";
import type {
	ColumnDataType,
	ComparisonOperatorExpression,
	InsertObject,
	UpdateObject,
} from "kysely";
import type { LucidErrorData } from "../../../types.js";
import type DatabaseAdapter from "../../db-adapter/adapter-base.js";
import type {
	Insert,
	Update,
	LucidDB,
	KyselyDB,
} from "../../db-adapter/types.js";
import type {
	QueryResult,
	ValidationConfigExtend,
	ExecuteMeta,
} from "../types.js";

abstract class BaseRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> {
	constructor(
		protected readonly db: KyselyDB,
		protected readonly dbAdapter: DatabaseAdapter,
		public tableName: keyof LucidDB,
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
		config: {
			type: Type;
			dynamicColumns?: Record<string, ColumnDataType>;
		},
	): Type extends "insert"
		? InsertObject<LucidDB, Table>
		: UpdateObject<LucidDB, Table> {
		const formatted: Record<string, unknown> = {};
		const columnFormats =
			config.dynamicColumns !== undefined
				? {
						...this.columnFormats,
						...config.dynamicColumns,
					}
				: this.columnFormats;
		for (const [key, value] of Object.entries(data)) {
			const columnType = columnFormats[key as keyof T];
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
	): ZodType {
		const baseSchema = config.schema || this.tableSchema;

		let selectSchema: ZodType;
		if (config.selectAll) {
			selectSchema = baseSchema;
		} else if (Array.isArray(config.select) && config.select.length > 0) {
			selectSchema = baseSchema.pick(
				config.select.reduce<Record<string, true>>((acc, key) => {
					acc[key as string] = true;
					return acc;
				}, {}),
			);
		} else {
			selectSchema = baseSchema.partial();
		}

		return this.wrapSchemaForMode(selectSchema, config.mode);
	}
	/**
	 * Responsible for creating schemas based on the mode
	 */
	private wrapSchemaForMode(
		schema: ZodType,
		mode: "single" | "multiple" | "multiple-count" | "count",
	): ZodType {
		switch (mode) {
			case "count": {
				return z
					.object({ count: z.union([z.number(), z.string()]) })
					.optional();
			}
			case "multiple-count":
				return z.tuple([
					z.array(schema),
					z.object({ count: z.union([z.number(), z.string()]) }).optional(),
				]);
			case "multiple":
				return z.array(schema);
			case "single":
				return schema;
		}
	}
	/**
	 * Merges the given schema with the tableSchema
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	protected mergeSchema(schema?: ZodObject<any>) {
		if (!schema) return this.tableSchema;
		return this.tableSchema.merge(schema.shape);
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
			const validationError = tidyZodError(validationResult.error);
			logger.error({
				message: validationError,
				scope: constants.logScopes.query,
				data: {
					table: executeResponse.meta.tableName,
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
	 * @todo add query data to debug log, add a sanitise data method that each repo can extend to mark certain columns to have data redacted, ie passwords, tokens, user data etc.
	 */
	protected async executeQuery<QueryData>(
		executeFn: () => Promise<QueryData>,
		config: {
			method: string;
			tableName?: string;
		},
	): Promise<{
		response:
			| { error: LucidErrorData; data: undefined }
			| { error: undefined; data: QueryData };
		meta: ExecuteMeta;
	}> {
		const startTime = process.hrtime();

		try {
			const result = await executeFn();

			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger.debug({
				message: "Query execution completed",
				scope: constants.logScopes.query,
				data: {
					table: config?.tableName ?? this.tableName,
					method: config.method,
					executionTime: `${executionTime}ms`,
				},
			});

			return {
				response: {
					data: result,
					error: undefined,
				},
				meta: {
					method: config.method,
					executionTime: `${executionTime}ms`,
					tableName: config?.tableName ?? this.tableName,
				},
			};
		} catch (error) {
			const endTime = process.hrtime(startTime);
			const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(
				2,
			);

			logger.error({
				message: "Query execution failed",
				scope: constants.logScopes.query,
				data: {
					table: config?.tableName ?? this.tableName,
					method: config.method,
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
					method: config.method,
					executionTime: `${executionTime}ms`,
					tableName: config?.tableName ?? this.tableName,
				},
			};
		}
	}
}

export default BaseRepository;
