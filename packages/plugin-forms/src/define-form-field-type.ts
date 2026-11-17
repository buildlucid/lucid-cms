import type { FormFieldTypeDefinition } from "./types.js";

/**
 * Defines a kind of field forms can hold. Add it to the forms plugin's `fieldTypes`: editors can
 * then add it in the form builder, and code-defined forms use it with `formField.custom`.
 *
 * @example
 * ```ts
 * const rating = defineFormFieldType({
 * 	key: "rating",
 * 	label: "Rating",
 * 	control: "number",
 * 	settings: [field.number("max", { default: 5 })],
 * 	schema: (field) =>
 * 		z.coerce.number().int().min(1).max(Number(field.settings.max ?? 5)),
 * });
 * ```
 */
const defineFormFieldType = <const Definition extends FormFieldTypeDefinition>(
	definition: Definition,
): Definition => definition;

export default defineFormFieldType;
