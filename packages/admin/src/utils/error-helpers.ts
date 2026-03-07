import type {
	ErrorResponse,
	ErrorResultObj,
	ErrorResultValue,
	FieldError,
} from "@types";
import type { Accessor } from "solid-js";

export const getBodyError = <T = ErrorResultObj>(
	key: string,
	errors: Accessor<ErrorResponse | undefined> | undefined | ErrorResponse,
) => {
	if (typeof errors === "function") {
		if (!errors()) {
			return undefined;
		}

		return errors()?.errors?.[key] as T | undefined;
	}

	if (!errors) {
		return undefined;
	}
	return errors.errors?.[key] as T | undefined;
};

export const getErrorObject = (
	error: ErrorResultValue,
): ErrorResultObj | undefined => {
	if (error === undefined) return undefined;
	if (typeof error === "string") return undefined;
	if (Array.isArray(error)) return undefined;

	return error;
};

/**
 * Normalizes field error props into an array so inputs can render one or many
 * validation messages through the same code path.
 */
export const normalizeFieldErrors = (
	errors?: ErrorResultObj | FieldError | FieldError[],
): FieldError[] => {
	if (!errors) return [];
	if (Array.isArray(errors)) return errors;

	if (
		"key" in errors &&
		typeof errors.key === "string" &&
		"localeCode" in errors
	) {
		return [errors as FieldError];
	}

	return [];
};
