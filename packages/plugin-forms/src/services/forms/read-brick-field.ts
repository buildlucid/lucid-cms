import { brickFields, FIELD_BRICK_PREFIX } from "../../constants.js";
import isFieldName from "../../shared/is-field-name.js";
import type { FormField, FormFieldTypeDefinition } from "../../types.js";
import resolveField from "./resolve-field.js";

/**
 * Reads the field a builder brick describes. Null for bricks of field types the config no longer
 * has, and for ones without a usable name, unless `fallbackName` stands in for it.
 */
const readBrickField = (
	fieldTypes: Map<string, FormFieldTypeDefinition>,
	brick: { key: string; fields: Record<string, unknown> },
	fallbackName?: string,
): FormField | null => {
	const type = fieldTypes.get(brick.key.slice(FIELD_BRICK_PREFIX.length));
	if (!type || !brick.key.startsWith(FIELD_BRICK_PREFIX)) return null;

	const {
		[brickFields.label]: label,
		[brickFields.name]: given,
		[brickFields.required]: required,
		[brickFields.width]: width,
		[brickFields.help]: help,
		[brickFields.placeholder]: placeholder,
		[brickFields.defaultValue]: defaultValue,
		...settings
	} = brick.fields;
	//* editors' stray spaces are dropped
	const trimmed = typeof given === "string" ? given.trim() : "";
	const name = isFieldName(trimmed) ? trimmed : fallbackName;
	if (name === undefined) return null;

	return resolveField(type, {
		name,
		label,
		required,
		width: Number(width),
		help,
		placeholder,
		defaultValue,
		settings,
	});
};

export default readBrickField;
