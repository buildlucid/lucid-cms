import type { FieldResponse, FieldInputSchema } from "../../../types.js";

/**
 * Process fields and return field values by locale
 */
const processFieldValues = (
	field: FieldInputSchema | FieldResponse,
	locales: string[],
	defaultLocale: string,
): Map<string, unknown> => {
	const valuesByLocale = new Map<string, unknown>();

	if (field.translations) {
		for (const locale of locales) {
			if (field.translations[locale] !== undefined) {
				valuesByLocale.set(locale, field.translations[locale]);
			} else {
				valuesByLocale.set(locale, null);
			}
		}
	} else if (field.value !== undefined) {
		for (const locale of locales) {
			if (locale === defaultLocale) {
				valuesByLocale.set(locale, field.value);
			} else {
				valuesByLocale.set(locale, null);
			}
		}
	} else {
		for (const locale of locales) {
			valuesByLocale.set(locale, null);
		}
	}

	return valuesByLocale;
};

export default processFieldValues;
