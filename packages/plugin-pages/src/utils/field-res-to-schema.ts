import type { FieldInputSchema } from "@lucidcms/core/types";
import type { VersionFieldsQueryResponse } from "../services/get-document-version-fields.js";

const fieldResToSchema = (
	key: string,
	useTranslations: boolean,
	defaultLocale: string,
	items: VersionFieldsQueryResponse[],
): FieldInputSchema => {
	// Determine field type based on key
	const fieldType = getFieldTypeFromKey(key);

	if (!fieldType) {
		throw new Error(`Unable to determine field type for key: ${key}`);
	}

	const result: FieldInputSchema = {
		key: key,
		type: fieldType,
	};

	if (useTranslations) {
		result.translations = {};

		for (const item of items) {
			if (fieldType === "text") {
				// @ts-expect-error
				result.translations[item.locale] = item[`_${key}`] as string | null;
			} else if (fieldType === "document") {
				// @ts-expect-error
				result.translations[item.locale] = item[`_${key}`] as number | null;
			}
		}
	} else {
		const defaultItem =
			items.find((item) => item.locale === defaultLocale) || items[0];

		if (fieldType === "text") {
			// @ts-expect-error
			result.value = defaultItem[`_${key}`] as string | null;
		} else if (fieldType === "document") {
			// @ts-expect-error
			result.value = defaultItem[`_${key}`] as number | null;
		}
	}

	return result;
};

// Helper function to determine field type based on key
function getFieldTypeFromKey(
	key: string,
): FieldInputSchema["type"] | undefined {
	switch (key) {
		case "slug":
		case "fullSlug":
			return "text";
		case "parentPage":
			return "document";
		default:
			return undefined;
	}
}

export default fieldResToSchema;
