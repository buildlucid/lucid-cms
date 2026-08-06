import type { InsertObject, UpdateObject } from "kysely";
import z, { type ZodObject, type ZodType } from "zod";
import constants from "../../../constants/constants.js";
import type { LucidErrorData } from "../../../types.js";
import { LucidError, tidyZodError } from "../../../utils/errors/index.js";
import type LucidDatabase from "../../db/client/lucid-database.js";
import type {
	ResolvedTableDefinition,
	TableDefinition,
} from "../../db/client/table/definition.js";
import type { Insert, KyselyDB, LucidDB, Update } from "../../db/types.js";
import { copy } from "../../i18n/index.js";
import logger from "../../logger/index.js";
import type {
	ExecuteMeta,
	QueryResult,
	ValidationConfigExtend,
} from "../types.js";

abstract class BaseRepository<
	Table extends keyof LucidDB,
	T extends LucidDB[Table] = LucidDB[Table],
> {
	protected readonly database: LucidDatabase;
	protected readonly db: KyselyDB;
	protected readonly dbAdapter;
	protected readonly config: ResolvedTableDefinition<Table>;
	public readonly tableName: keyof LucidDB;

	constructor(database: LucidDatabase, table: TableDefinition<Table>) {
		this.database = database;
		this.db = database.kysely;
		this.dbAdapter = database.adapter;
		let registered = database.tables.resolveDefinition(table);
		if (!registered) {
			database.registerTable(table);
			registered = database.tables.resolveDefinition(table);
		}
		if (!registered) {
			throw new LucidError({
				message: `Table metadata not found: ${String(table.name)}`,
			});
		}
		this.config = registered;
		this.tableName = table.name;
	}

	/** Narrows generic repository input; the database plugin owns all encoding. */
	protected asInsertData(
		data: Partial<Insert<T>>,
	): InsertObject<LucidDB, Table> {
		return data as InsertObject<LucidDB, Table>;
	}

	/** Narrows generic repository input; the database plugin owns all encoding. */
	protected asUpdateData(
		data: Partial<Update<T>>,
	): UpdateObject<LucidDB, Table> {
		return data as UpdateObject<LucidDB, Table>;
	}

	/** Builds the validation schema for the repository query's selected mode. */
	protected createValidationSchema<V extends boolean = false>(
		config: ValidationConfigExtend<V>,
	): ZodType {
		const baseSchema = config.schema || this.config.schema;
		let selectSchema: ZodType;

		if (config.selectAll) {
			selectSchema = baseSchema;
		} else if (Array.isArray(config.select) && config.select.length > 0) {
			selectSchema = baseSchema.pick(
				config.select.reduce<Record<string, true>>((acc, key) => {
					acc[key] = true;
					return acc;
				}, {}),
			);
		} else {
			selectSchema = baseSchema.partial();
		}

		return this.wrapSchemaForMode(selectSchema, config.mode);
	}

	private wrapSchemaForMode(
		schema: ZodType,
		mode: "single" | "multiple" | "multiple-count" | "count",
	): ZodType {
		switch (mode) {
			case "count":
				return z
					.object({ count: z.union([z.number(), z.string()]) })
					.optional();
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

	// biome-ignore lint/suspicious/noExplicitAny: repository schemas are heterogeneous
	protected mergeSchema(schema?: ZodObject<any>) {
		if (!schema) return this.config.schema;
		return this.config.schema.extend(schema.shape);
	}

	/** Validates a successful managed query response when explicitly enabled. */
	protected async validateResponse<QueryData, V extends boolean = false>(
		executeResponse: Awaited<
			ReturnType<typeof this.executeQuery<QueryData | undefined>>
		>,
		config?: ValidationConfigExtend<V>,
	): Promise<QueryResult<QueryData, V>> {
		const response = executeResponse.response as QueryResult<QueryData, V>;
		if (config?.enabled !== true) return response;

		if (response.data === undefined || response.data === null) {
			return {
				error: {
					...config.defaultError,
					status: config.defaultError?.status ?? 404,
				},
				data: undefined,
			};
		}

		const validationResult = await this.createValidationSchema(
			config,
		).safeParseAsync(response.data);
		if (validationResult.success) {
			return {
				data: response.data as NonNullable<QueryData>,
				error: undefined,
			};
		}

		const validationError = tidyZodError(validationResult.error);
		logger.error({
			event: "query.response.validation.failed",
			message: "Query response validation failed",
			scope: constants.logScopes.query,
			data: {
				table: executeResponse.meta.tableName,
				method: executeResponse.meta.method,
				executionTime: executeResponse.meta.executionTime,
				validationError,
			},
		});
		return {
			data: undefined,
			error: {
				...config.defaultError,
				message:
					config.defaultError?.message ??
					copy("server:core.errors.validation.name"),
				type: config.defaultError?.type ?? "validation",
				status: config.defaultError?.status ?? 400,
			},
		};
	}

	/** Delegates repository execution to the shared Lucid database boundary. */
	protected executeQuery<QueryData>(
		executeFn: () => Promise<QueryData>,
		config: { method: string; tableName?: string },
	): Promise<{
		response:
			| { error: LucidErrorData; data: undefined }
			| { error: undefined; data: QueryData };
		meta: ExecuteMeta;
	}> {
		return this.database.execute(executeFn, {
			method: config.method,
			tableName: config.tableName ?? String(this.tableName),
		});
	}
}

export default BaseRepository;
