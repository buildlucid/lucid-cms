import type { FieldInputSchema } from "@lucidcms/core/types";

/**
 * Returns the single parent page ID used by the pages plugin.
 */
const getParentPageId = (field: FieldInputSchema): number | null => {
	if (!Array.isArray(field.value)) return null;

	const parentPageValue = field.value[0];
	if (typeof parentPageValue !== "object" || parentPageValue === null) {
		return null;
	}
	if (!("id" in parentPageValue)) return null;

	return typeof parentPageValue.id === "number" ? parentPageValue.id : null;
};

export default getParentPageId;
