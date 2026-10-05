import type { FieldInputSchema, FieldValue } from "@lucidcms/core/types";
import type { PageFieldsRow } from "../services/get-pages-fields.js";
import type { ResolvedPagesCollectionLocalization } from "./resolve-pages-collection-localization.js";

const fieldResToSchema = (
	key: string,
	fieldLocalized: boolean,
	localization: ResolvedPagesCollectionLocalization,
	items: PageFieldsRow[],
	relationCollectionKey?: string,
): FieldInputSchema => {
	if (key !== "slug" && key !== "fullSlug" && key !== "parentPage") {
		throw new Error(`Unable to determine field type for key: ${key}`);
	}
	const valueFor = (item?: PageFieldsRow): FieldValue => {
		if (key !== "parentPage") {
			return item?.[key === "slug" ? "_slug" : "_fullSlug"] ?? null;
		}
		return typeof item?._parentPage === "number" && relationCollectionKey
			? [{ id: item._parentPage, collectionKey: relationCollectionKey }]
			: [];
	};
	const field: FieldInputSchema = {
		key,
		type: key === "parentPage" ? "relation" : "text",
	};
	if (fieldLocalized && localization.enabled) {
		field.translations = Object.fromEntries(
			items.flatMap((item) =>
				item.locale !== null && localization.locales.includes(item.locale)
					? [[item.locale, valueFor(item)]]
					: [],
			),
		);
	} else {
		field.value = valueFor(items.find((item) => item.locale === null));
	}
	return field;
};
export default fieldResToSchema;
