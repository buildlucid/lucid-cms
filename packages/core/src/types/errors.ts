import type {
	BrickError,
	ErrorResult,
	ErrorResultObj,
	ErrorResultValue,
	FieldError,
	GroupError,
	PublicErrorData,
} from "@lucidcms/types";
import type z from "zod";

export type {
	BrickError,
	ErrorResult,
	ErrorResultObj,
	ErrorResultValue,
	FieldError,
	GroupError,
	PublicErrorData,
};

export interface LucidErrorData extends PublicErrorData {
	zod?: z.ZodError;
}
