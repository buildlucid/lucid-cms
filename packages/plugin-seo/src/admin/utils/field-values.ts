import type { EditorFieldState, EditorFieldValue } from "@lucidcms/admin/types";

export const readText = (fields: readonly EditorFieldState[], key: string) => {
	const field = fields.find((field) => field.key === key);
	return field && typeof field.value === "string" ? field.value : "";
};

export const readImageId = (value: EditorFieldValue) => {
	if (!Array.isArray(value)) return undefined;
	const id = value[0];
	return typeof id === "number" ? id : undefined;
};

export const readImageField = (
	fields: readonly EditorFieldState[],
	key: string,
) => readImageId(fields.find((field) => field.key === key)?.value);
