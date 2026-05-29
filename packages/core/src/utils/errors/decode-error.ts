import constants from "../../constants/constants.js";
import { isTranslatableText, translate } from "../../libs/i18n/index.js";
import type { PublicErrorData } from "../../types.js";
import { LucidAPIError } from "./index.js";

const translateNestedErrorText = (value: unknown): unknown => {
	if (isTranslatableText(value)) return translate.text(value);
	if (Array.isArray(value)) return value.map(translateNestedErrorText);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				translateNestedErrorText(nested),
			]),
		);
	}
	return value;
};

const decodeError = (error: Error): PublicErrorData => {
	if (error instanceof LucidAPIError) {
		return {
			name: error.error.name
				? translate.text(error.error.name)
				: constants.errors.name,
			message: error.error.message
				? translate.text(error.error.message)
				: constants.errors.message,
			status: error.error.status,
			errors: translateNestedErrorText(
				error.error.errors,
			) as PublicErrorData["errors"],
			code: error.error.code,
		};
	}

	// @ts-expect-error
	if (error?.statusCode === 429) {
		return {
			code: "rate_limit",
			name: translate.server("core.rate.limit.error.name"),
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
