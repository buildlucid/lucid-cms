import constants from "../../constants/constants.js";
import { isTranslatableCopy, translate } from "../../libs/i18n/index.js";
import type { PublicErrorData } from "../../types.js";
import { LucidAPIError } from "./index.js";

const translateNestedErrorCopy = (value: unknown): unknown => {
	if (isTranslatableCopy(value)) return translate(value);
	if (Array.isArray(value)) return value.map(translateNestedErrorCopy);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				translateNestedErrorCopy(nested),
			]),
		);
	}
	return value;
};

const decodeError = (error: Error): PublicErrorData => {
	if (error instanceof LucidAPIError) {
		return {
			name: error.error.name
				? translate(error.error.name)
				: constants.errors.name,
			message: error.error.message
				? translate(error.error.message)
				: constants.errors.message,
			status: error.error.status,
			errors: translateNestedErrorCopy(
				error.error.errors,
			) as PublicErrorData["errors"],
			code: error.error.code,
		};
	}

	// @ts-expect-error
	if (error?.statusCode === 429) {
		return {
			code: "rate_limit",
			name: translate("server:core.rate.limit.error.name"),
			message: error.message || constants.errors.message,
			status: 429,
		};
	}

	return {
		name: constants.errors.name,
		message: error.message || constants.errors.message,
		status: constants.errors.status,
		errors: constants.errors.errors,
		code: constants.errors.code,
	};
};

export default decodeError;
