export interface PublicErrorData {
	type?:
		| "validation"
		| "basic"
		| "forbidden"
		| "authorisation"
		| "cron"
		| "plugin"
		| "rate_limit";
	name?: string;
	message?: string;
	status?: number;
	code?: "csrf" | "login" | "authorisation" | "rate_limit" | "not_found";
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
	localeCode: string | null;
	message: string;
	itemIndex?: number;
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
