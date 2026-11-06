import type { FieldTranslation } from "../types.js";

/** Translates string values as plain text, for text and textarea fields. */
const plainTextTranslation: FieldTranslation = {
	read: (value) =>
		typeof value === "string" && value.trim() !== ""
			? { format: "text", text: value }
			: null,
	write: (text) => text,
};

export default plainTextTranslation;
