import readOptions from "../../shared/read-options.js";
import type { FormField, FormValue } from "../../types.js";

/**
 * Writes an answer as people read it, in emails and summaries: choices by their labels, ticked
 * boxes as Yes or No and lists separated by commas.
 */
const formatAnswer = (formField: FormField, value: FormValue): string => {
	if (value === null) return "";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return String(value);

	const options = readOptions(formField.settings);
	const label = (item: string) =>
		options.find((option) => option.value === item)?.label ?? item;

	return Array.isArray(value) ? value.map(label).join(", ") : label(value);
};

export default formatAnswer;
