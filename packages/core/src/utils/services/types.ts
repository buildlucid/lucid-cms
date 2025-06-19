import type { ZodType } from "zod/v4";
import type { Config } from "../../types/config.js";
import type { KyselyDB } from "../../libs/db/types.js";
import type { LucidErrorData } from "../../types/errors.js";
import type lucidServices from "../../services/index.js";

export type ServiceContext = {
	db: KyselyDB;
	config: Config;
	services: typeof lucidServices;
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
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errorResponse">;
	logError?: boolean;
};

export type ServiceResponse<T> = Promise<
	{ error: LucidErrorData; data: undefined } | { error: undefined; data: T }
>;

export type ServiceFn<T extends unknown[], R> = (
	service: ServiceContext,
	...args: T
) => ServiceResponse<R>;
