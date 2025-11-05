import type { ErrorResponse, ErrorResultObj, ErrorResultValue } from "@types";
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
