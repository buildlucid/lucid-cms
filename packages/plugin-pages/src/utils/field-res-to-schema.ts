import type { FieldSchemaType, CustomFieldMap } from "@lucidcms/core/types";

const fieldResToSchema = (
	key: string,
	useTranslations: boolean,
	defaultLocale: string,
	items: Array<{
		key: string;
		collection_document_id: number;
		collection_brick_id: number;
		locale_code: string;
		text_value: string | null;
		document_id: number | null;
		type: FieldSchemaType["type"] | keyof CustomFieldMap;
	}>,
): FieldSchemaType => {
	const relevantItems = items.filter((item) => item.key === key);
	const item = relevantItems[0];

	if (relevantItems.length === 0 || item === undefined) {
		throw new Error(`No items found for key: ${key}`);
	}

	const result: FieldSchemaType = {
		key: key,
		type: item.type as FieldSchemaType["type"],
	};

	if (useTranslations) {
		result.translations = {};
		for (const item of relevantItems) {
			if (item.type === "text") {
				result.translations[item.locale_code] = item.text_value;
			} else if (item.type === "document") {
				result.translations[item.locale_code] = item.document_id;
			}
		}
	} else {
		const defaultItem =
			relevantItems.find((item) => item.locale_code === defaultLocale) || item;

		if (defaultItem?.type === "text") {
			result.value = defaultItem.text_value;
		} else if (defaultItem?.type === "document") {
			result.value = defaultItem.document_id;
		}
	}

	return result;
};

export default fieldResToSchema;
