import type { ZodType } from "zod/v4";
import type { EnvironmentVariables } from "../../libs/adapter/types.js";
import type { KyselyDB } from "../../libs/db/types.js";
import type { KVAdapterInstance } from "../../libs/kv/types.js";
import type { QueueAdapterInstance } from "../../libs/queues/types.js";
import type { Config } from "../../types/config.js";
import type { LucidErrorData } from "../../types/errors.js";

export type ServiceContext = {
	db: KyselyDB;
	config: Config;
	env: EnvironmentVariables | null;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
};
export type ServiceProps<T> = {
	serviceConfig?: ServiceContext;
	data?: T;
	[key: string]: unknown;
};

export type ServiceWrapperConfig = {
	transaction: boolean; //* Decides whether the db queries should be within a transaction or not
	schema?: ZodType<unknown>;
	schemaArgIndex?: number; //* The index of the argument to parse the schema against
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">;
	logError?: boolean;
};

export type ServiceResponse<T> = Promise<
	{ error: LucidErrorData; data: undefined } | { error: undefined; data: T }
>;

export type ServiceFn<T extends unknown[], R> = (
	service: ServiceContext,
	...args: T
) => ServiceResponse<R>;
