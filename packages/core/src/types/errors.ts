import type {
	BrickError as PublicBrickError,
	PublicErrorData,
	FieldError as PublicFieldError,
	GroupError as PublicGroupError,
} from "@lucidcms/types";
import type z from "zod";
import type { LiteralCopy, ServerCopyDescriptor } from "../libs/i18n/types.js";

export type { PublicErrorData };

export type ErrorCopy = ServerCopyDescriptor | LiteralCopy;

export type ErrorResultValue =
	| ErrorResultObj
	| ErrorResultObj[]
	| FieldError[]
	| GroupError[]
	| BrickError[]
	| ErrorCopy
	| string
	| undefined;

export interface ErrorResultObj {
	code?: string;
	message?: ErrorCopy;
	children?: ErrorResultObj[];
	[key: string]: ErrorResultValue;
}

export type ErrorResult = Record<string, ErrorResultValue>;

export interface FieldError
	extends Omit<PublicFieldError, "message" | "groupErrors"> {
	message: ErrorCopy;
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
	name?: ErrorCopy;
	message?: ErrorCopy;
	errors?: ErrorResult;
	zod?: z.ZodError;
	cause?: unknown;
}
