import type { PublicErrorData } from "@lucidcms/types";
import { isServerText, translateServerText } from "../../libs/i18n/index.js";
import type { TranslateServerOptions } from "../../libs/i18n/types.js";
import type { ErrorText, LucidErrorData } from "../../types/errors.js";

const translateErrorText = (
	text: ErrorText | undefined,
	options?: TranslateServerOptions,
) => {
	if (!text) return text;
	return translateServerText(text, options);
};

const translateNestedErrorText = (
	value: unknown,
	options?: TranslateServerOptions,
): unknown => {
	if (isServerText(value)) return translateServerText(value, options);
	if (Array.isArray(value)) {
		return value.map((item) => translateNestedErrorText(item, options));
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				translateNestedErrorText(nested, options),
			]),
		);
	}
	return value;
};

/**
 * Resolves deferred server translation keys inside an API error payload.
 */
const translateErrorData = (
	error: LucidErrorData,
	options?: TranslateServerOptions,
): PublicErrorData => ({
	...error,
	name: translateErrorText(error.name, options),
	message: translateErrorText(error.message, options),
	errors: translateNestedErrorText(
		error.errors,
		options,
	) as PublicErrorData["errors"],
});

export default translateErrorData;
