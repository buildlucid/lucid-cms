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
	if (
		"type" in error &&
		((error as { type?: string }).type === "lucid.copy" ||
			(error as { type?: string }).type === "lucid.literal")
	) {
		return undefined;
	}

	return error as ErrorResultObj;
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

/** Resolves API error copy into text suitable for compact validation UI. */
export const resolveFieldErrorMessage = (
	message: FieldError["message"] | string,
) => {
	if (typeof message === "string") return message;

	const value =
		message.type === "lucid.literal"
			? message.value
			: (message.defaultMessage ?? message.key);
	return value.replace(
		/\{\{(\w+)\}\}/g,
		(_, key) => message.values?.[key]?.toString() ?? "",
	);
};
