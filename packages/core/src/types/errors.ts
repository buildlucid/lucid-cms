import type {
	BrickError as PublicBrickError,
	PublicErrorData,
	FieldError as PublicFieldError,
	GroupError as PublicGroupError,
} from "@lucidcms/types";
import type z from "zod";
import type { ServerText } from "../libs/i18n/types.js";

export type { PublicErrorData };

export type ErrorText = ServerText;

export type ErrorResultValue =
	| ErrorResultObj
	| ErrorResultObj[]
	| FieldError[]
	| GroupError[]
	| BrickError[]
	| ErrorText
	| string
	| undefined;

export interface ErrorResultObj {
	code?: string;
	message?: ErrorText;
	children?: ErrorResultObj[];
	[key: string]: ErrorResultValue;
}

export type ErrorResult = Record<string, ErrorResultValue>;

export interface FieldError
	extends Omit<PublicFieldError, "message" | "groupErrors"> {
	message: ErrorText;
	groupErrors?: Array<GroupError>;
}

export interface GroupError extends Omit<PublicGroupError, "fields"> {
	fields: FieldError[];
}

export interface BrickError extends Omit<PublicBrickError, "fields"> {
	fields: FieldError[];
}

export interface LucidErrorData
	extends Omit<PublicErrorData, "name" | "message" | "errors"> {
	name?: ErrorText;
	message?: ErrorText;
	errors?: ErrorResult;
	zod?: z.ZodError;
}
