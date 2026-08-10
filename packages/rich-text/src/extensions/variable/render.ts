import { escapeHTML } from "@tiptap/static-renderer/json/html-string";

/** Renders a hydrated scalar variable as escaped text. */
export const renderVariableNode = (value: unknown): string => {
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return escapeHTML(String(value));
	}

	return "";
};
