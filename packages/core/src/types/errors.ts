import type z from "zod/v4";

export interface LucidErrorData {
	type?:
		| "validation"
		| "basic"
		| "forbidden"
		| "authorisation"
		| "cron"
		| "plugin";

	name?: string;
	message?: string;
	status?: number;
	code?: "csrf" | "login" | "authorisation" | "rate_limit" | "not_found";
	zod?: z.ZodError;
	errors?: ErrorResult;
}

export type ErrorResultValue =
	| ErrorResultObj
	| ErrorResultObj[]
	| FieldError[]
	| GroupError[]
	| BrickError[]
	| string
	| undefined;

export interface ErrorResultObj {
	code?: string;
	message?: string;
	children?: ErrorResultObj[];
	[key: string]: ErrorResultValue;
}

export type ErrorResult = Record<string, ErrorResultValue>;

export interface FieldError {
	key: string;
	/** Set if the error occured on a translation value, or it uses the default locale code when the field supports translations but only a value is given. Otherwise this is undefined. */
	localeCode: string | null;
	message: string;
	groupErrors?: Array<GroupError>;
}

export interface GroupError {
	ref: string;
	order: number;
	fields: FieldError[];
}

export interface BrickError {
	ref: string;
	key: string;
	order: number;
	fields: FieldError[];
}
