import type {
	BrickError as PublicBrickError,
	PublicErrorData,
	FieldError as PublicFieldError,
	GroupError as PublicGroupError,
} from "@lucidcms/types";
import type z from "zod";
import type { LiteralCopy, ServerCopyDescriptor } from "../libs/i18n/types.js";

export type {
	FieldErrorMeta,
	PublicErrorData,
	RichTextFieldErrorReference,
} from "@lucidcms/types";

/** Server translation descriptor or literal text. Create one with copy() or copy.literal(). */
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

/** Structured failure returned by services or passed to LucidAPIError. Use copy() or copy.literal() for name and message. */
export interface LucidErrorData
	extends Omit<PublicErrorData, "name" | "message" | "errors"> {
	name?: ErrorCopy;
	message?: ErrorCopy;
	errors?: ErrorResult;
	/** Zod validation failure to format as field errors in an HTTP response. */
	zod?: z.ZodError;
	/** Original exception retained for diagnostics. */
	cause?: unknown;
}
