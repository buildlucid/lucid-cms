import type { PublicErrorData } from "@lucidcms/types";
import { isTranslatableText } from "../../libs/i18n/index.js";
import type { Translator } from "../../libs/i18n/types.js";
import type { ErrorText, LucidErrorData } from "../../types/errors.js";

const translateErrorText = (
	text: ErrorText | undefined,
	translator: Translator,
) => {
	if (!text) return text;
	return translator.text(text);
};

const translateNestedErrorText = (
	value: unknown,
	translator: Translator,
): unknown => {
	if (isTranslatableText(value)) return translator.text(value);
	if (Array.isArray(value)) {
		return value.map((item) => translateNestedErrorText(item, translator));
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				translateNestedErrorText(nested, translator),
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
	name: translateErrorText(error.name, translator),
	message: translateErrorText(error.message, translator),
	errors: translateNestedErrorText(
		error.errors,
		translator,
	) as PublicErrorData["errors"],
});

export default translateErrorData;
