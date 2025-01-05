import type { ZodSchema } from "zod";
import type { LucidErrorData } from "../../types.js";

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
	schema?: ZodSchema;
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errorResponse">;
};

export interface ValidationConfigExtend<V extends boolean = false>
	extends ValidationConfig<V> {
	mode: "single" | "multiple" | "multiple-count";
	select?: string[];
	selectAll?: boolean;
}

export type QueryProps<V extends boolean, P extends object> = P & {
	validation?: ValidationConfig<V>;
};

export type ExecuteMeta = {
	id: string;
	method: string;
	executionTime: string;
};
