import type { PublicErrorData } from "@lucidcms/types";
import { isTranslatableCopy } from "../../libs/i18n/index.js";
import type { Translator } from "../../libs/i18n/types.js";
import type { ErrorCopy, LucidErrorData } from "../../types/errors.js";

const translateErrorCopy = (
	text: ErrorCopy | undefined,
	translator: Translator,
) => {
	if (!text) return text;
	return translator(text);
};

const translateNestedErrorCopy = (
	value: unknown,
	translator: Translator,
): unknown => {
	if (isTranslatableCopy(value)) return translator(value);
	if (Array.isArray(value)) {
		return value.map((item) => translateNestedErrorCopy(item, translator));
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				translateNestedErrorCopy(nested, translator),
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
	translator: Translator,
): PublicErrorData => ({
	...error,
	name: translateErrorCopy(error.name, translator),
	message: translateErrorCopy(error.message, translator),
	errors: translateNestedErrorCopy(
		error.errors,
		translator,
	) as PublicErrorData["errors"],
});

export default translateErrorData;
