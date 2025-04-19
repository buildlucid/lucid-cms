import type z from "zod";

export interface LucidErrorData {
	type?:
		| "validation"
		| "basic"
		| "forbidden"
		| "authorisation"
		| "cron"
		| "toolkit";

	name?: string;
	message?: string;
	status?: number;
	code?: "csrf" | "login" | "authorisation" | "rate_limit" | "not_found";
	zod?: z.ZodError;
	errorResponse?: ErrorResult;
}

export type ErrorResultValue =
	| ErrorResultObj
	| ErrorResultObj[]
	| FieldErrors[]
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

export interface FieldErrors {
	key: string;
	/** Set if the error occured on a translation value, or it uses the default locale code when the field supports translations but only a value is given. Otherwise this is undefined. */
	localeCode?: string;
	message: string;
	groupErrors?: Array<GroupError>;
}

export interface GroupError {
	id: string | number;
	order?: number;
	fields: FieldErrors[];
}

export interface BrickError {
	id: number | string;
	key?: string;
	order?: number;
	fields: FieldErrors[];
}
