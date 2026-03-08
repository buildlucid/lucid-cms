import type { FieldInputSchema } from "@lucidcms/core/types";
import normalizePathValue from "./normalize-path-value.js";

const normalizePathField = (field: FieldInputSchema): void => {
	if (field.type !== "text") return;

	if (field.translations) {
		field.translations = Object.fromEntries(
			Object.entries(field.translations).map(([locale, value]) => [
				locale,
				normalizePathValue(value),
			]),
		);
	}

	if ("value" in field) {
		field.value = normalizePathValue(field.value);
	}
};

export default normalizePathField;
