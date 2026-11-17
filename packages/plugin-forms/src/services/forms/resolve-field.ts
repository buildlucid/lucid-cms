import { fieldWidths } from "../../constants.js";
import readText from "../../shared/read-text.js";
import type {
	FormField,
	FormFieldSettings,
	FormFieldTypeDefinition,
	FormFieldWidth,
} from "../../types.js";

const isWidth = (value: unknown): value is FormFieldWidth =>
	fieldWidths.some((width) => width === value);

/**
 * Builds a field from its type and the values given for it, in code or by an editor, filling in
 * what was left out and dropping the shared settings its type goes without.
 */
const resolveField = (
	type: FormFieldTypeDefinition,
	given: {
		name: string;
		label?: unknown;
		required?: unknown;
		width?: unknown;
		help?: unknown;
		placeholder?: unknown;
		defaultValue?: unknown;
		settings: FormFieldSettings;
	},
): FormField => {
	const without = type.without ?? [];

	return {
		type: type.key,
		control: type.control,
		name: given.name,
		label: readText(given.label) ?? given.name,
		required: !without.includes("required") && given.required === true,
		width:
			!without.includes("width") && isWidth(given.width) ? given.width : 12,
		help: without.includes("help") ? null : readText(given.help),
		placeholder: without.includes("placeholder")
			? null
			: readText(given.placeholder),
		defaultValue: without.includes("defaultValue")
			? null
			: readText(given.defaultValue),
		settings: given.settings,
	};
};

export default resolveField;
