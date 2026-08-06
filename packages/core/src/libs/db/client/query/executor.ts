import type { Executable } from "kysely";
import type { output as ZodOutput, ZodType } from "zod";
import constants from "../../../../constants/constants.js";
import type { LucidErrorData } from "../../../../types.js";
import { tidyZodError } from "../../../../utils/errors/index.js";
import { copy } from "../../../i18n/index.js";
import logger from "../../../logger/index.js";
import type { KyselyDB } from "../../types.js";
import { captureQueryTableName } from "./metadata.js";

export type ManagedQueryResult<T> =
	| { error: undefined; data: T }
	| { error: LucidErrorData; data: undefined };

export type QueryExecutionMeta = {
	method: string;
	executionTime: string;
	tableName: string;
};

export type QueryExecutionOptions = {
	method: string;
	tableName?: string;
};

export type ManagedExecution<T> = {
	response: ManagedQueryResult<T>;
	meta: QueryExecutionMeta;
};

export type QueryTerminalOptions<Schema extends ZodType = ZodType> = {
	schema?: Schema;
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">;
};

export type FirstQueryTerminalOptions<Schema extends ZodType = ZodType> =
	QueryTerminalOptions<Schema> & {
		required?: boolean;
	};

type ManyResult<Output> = Awaited<ReturnType<Executable<Output>["execute"]>>;
type FirstResult<Output> = Awaited<
	ReturnType<Executable<Output>["executeTakeFirst"]>
>;
type ManagedRun = <T>(
	execute: () => Promise<T>,
	options: QueryExecutionOptions,
) => Promise<ManagedExecution<T>>;

const executionTime = (startedAt: number) =>
	`${(performance.now() - startedAt).toFixed(2)}ms`;

/** A deferred managed query that can return many rows or its first row. */
export class ManagedQuery<Output> {
	readonly #query: () => Executable<Output>;
	readonly #options: QueryExecutionOptions;
	readonly #run: ManagedRun;

	constructor(props: {
		query: () => Executable<Output>;
		options: QueryExecutionOptions;
		run: ManagedRun;
	}) {
		this.#query = props.query;
		this.#options = props.options;
		this.#run = props.run;
	}

	#runQuery<T>(execute: (query: Executable<Output>) => Promise<T>) {
		const executionOptions = { ...this.#options };
		return this.#run(() => {
			const query = captureQueryTableName(this.#query(), (tableName) => {
				executionOptions.tableName ??= tableName;
			});
			return execute(query);
		}, executionOptions);
	}

	/** Executes the query and optionally validates every returned row. */
	many<Schema extends ZodType>(
		options: QueryTerminalOptions<Schema> & { schema: Schema },
	): Promise<ManagedQueryResult<Array<ZodOutput<Schema>>>>;
	many(
		options?: QueryTerminalOptions,
	): Promise<ManagedQueryResult<ManyResult<Output>>>;
	async many(
		options: QueryTerminalOptions = {},
	): Promise<ManagedQueryResult<unknown>> {
		const execution = await this.#runQuery((query) => query.execute());
		if (execution.response.error || !options.schema) return execution.response;

		const result = await options.schema
			.array()
			.safeParseAsync(execution.response.data);
		if (result.success) {
			return { error: undefined, data: result.data };
		}

		logger.error({
			event: "query.response.validation.failed",
			message: "Query response validation failed",
			scope: constants.logScopes.query,
			data: {
				table: execution.meta.tableName,
				method: execution.meta.method,
				executionTime: execution.meta.executionTime,
				validationError: tidyZodError(result.error),
			},
		});
		return {
			data: undefined,
			error: {
				...options.defaultError,
				message:
					options.defaultError?.message ??
					copy("server:core.errors.validation.name"),
				type: options.defaultError?.type ?? "validation",
				status: options.defaultError?.status ?? 400,
				zod: result.error,
			},
		};
	}

	/** Executes the query, optionally requiring and validating its first row. */
	first<Schema extends ZodType>(
		options: FirstQueryTerminalOptions<Schema> & {
			schema: Schema;
			required: true;
		},
	): Promise<ManagedQueryResult<ZodOutput<Schema>>>;
	first<Schema extends ZodType>(
		options: FirstQueryTerminalOptions<Schema> & {
			schema: Schema;
			required?: false;
		},
	): Promise<ManagedQueryResult<ZodOutput<Schema> | undefined>>;
	first(
		options: FirstQueryTerminalOptions & { required: true },
	): Promise<ManagedQueryResult<NonNullable<FirstResult<Output>>>>;
	first(
		options?: FirstQueryTerminalOptions,
	): Promise<ManagedQueryResult<FirstResult<Output>>>;
	async first(
		options: FirstQueryTerminalOptions = {},
	): Promise<ManagedQueryResult<unknown>> {
		const execution = await this.#runQuery((query) => query.executeTakeFirst());
		if (execution.response.error) return execution.response;

		if (
			options.required === true &&
			(execution.response.data === undefined ||
				execution.response.data === null)
		) {
			return {
				data: undefined,
				error: {
					...options.defaultError,
					status: options.defaultError?.status ?? 404,
				},
			};
		}

		if (!options.schema || execution.response.data == null) {
			return execution.response;
		}

		const result = await options.schema.safeParseAsync(execution.response.data);
		if (result.success) {
			return {
				error: undefined,
				data: result.data,
			};
		}

		logger.error({
			event: "query.response.validation.failed",
			message: "Query response validation failed",
			scope: constants.logScopes.query,
			data: {
				table: execution.meta.tableName,
				method: execution.meta.method,
				executionTime: execution.meta.executionTime,
				validationError: tidyZodError(result.error),
			},
		});
		return {
			data: undefined,
			error: {
				...options.defaultError,
				message:
					options.defaultError?.message ??
					copy("server:core.errors.validation.name"),
				type: options.defaultError?.type ?? "validation",
				status: options.defaultError?.status ?? 400,
				zod: result.error,
			},
		};
	}
}

export type QueryFactory<Output> = (db: KyselyDB) => Executable<Output>;

/** Executes a query and provides the shared Lucid logging/error envelope. */
export const executeManagedQuery = async <T>(
	execute: () => Promise<T>,
	options: QueryExecutionOptions,
): Promise<ManagedExecution<T>> => {
	const startedAt = performance.now();

	try {
		const data = await execute();
		const elapsed = executionTime(startedAt);
		logger.debug({
			event: "query.execution.completed",
			message: "Query execution completed",
			scope: constants.logScopes.query,
			data: {
				table: options.tableName ?? "unknown",
				method: options.method,
				executionTime: elapsed,
			},
		});

		return {
			response: { error: undefined, data },
			meta: {
				method: options.method,
				executionTime: elapsed,
				tableName: options.tableName ?? "unknown",
			},
		};
	} catch (error) {
		const elapsed = executionTime(startedAt);
		logger.error({
			error,
			event: "query.execution.failed",
			message: "Query execution failed",
			scope: constants.logScopes.query,
			data: {
				table: options.tableName ?? "unknown",
				method: options.method,
				executionTime: elapsed,
				errorMessage:
					error instanceof Error ? error.message : "An unknown error occurred",
			},
		});

		return {
			response: {
				data: undefined,
				error: {
					message: copy(
						"server:core.errors.unknown",
						error instanceof Error
							? { defaultMessage: error.message }
							: undefined,
					),
					status: 500,
				},
			},
			meta: {
				method: options.method,
				executionTime: elapsed,
				tableName: options.tableName ?? "unknown",
			},
		};
	}
};
