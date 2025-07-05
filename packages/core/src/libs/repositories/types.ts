import type { ZodObject } from "zod/v4";
import type { LucidErrorData, LucidDB } from "../../types.js";
import type { ColumnDataType } from "kysely";

export type QueryErrorResult = {
	error: LucidErrorData;
	data: undefined;
};

export type QuerySuccessResult<T> = {
	error: undefined;
	data: T;
};

export type ValidatedQueryResult<T> =
	| QuerySuccessResult<NonNullable<T>>
	| QueryErrorResult;

export type RawQueryResult<T> =
	| QuerySuccessResult<T | undefined>
	| QueryErrorResult;

export type QueryResult<T, V extends boolean = false> = V extends true
	? ValidatedQueryResult<T>
	: RawQueryResult<T>;

export type ValidationConfig<V extends boolean = false> = {
	enabled?: V;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema?: ZodObject<any>;
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">;
};

export interface ValidationConfigExtend<V extends boolean = false>
	extends ValidationConfig<V> {
	mode: "single" | "multiple" | "multiple-count" | "count";
	select?: string[];
	selectAll?: boolean;
}

export type QueryProps<V extends boolean, P extends object> = P & {
	validation?: ValidationConfig<V>;
};

export type ExecuteMeta = {
	method: string;
	executionTime: string;
	tableName: string;
};

export type DynamicConfig<Pattern extends keyof LucidDB> = {
	tableName: Pattern;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema?: ZodObject<any>;
	columns?: Record<string, ColumnDataType>;
};
