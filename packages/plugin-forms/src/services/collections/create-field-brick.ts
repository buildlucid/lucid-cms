import { copy, defineBrick, field, z } from "@lucidcms/core";
import type { ContentFieldNode } from "@lucidcms/core/types";
import {
	brickFields,
	FIELD_BRICK_PREFIX,
	fieldWidths,
} from "../../constants.js";
import isFieldName from "../../shared/is-field-name.js";
import type { FormFieldTypeDefinition, FormFieldWidth } from "../../types.js";

const nameSchema = z
	.string()
	.trim()
	.refine(
		isFieldName,
		"Start with a letter, then use letters, numbers, hyphens and underscores. Names like 'constructor' can't be used.",
	);

const widthLabels: Record<FormFieldWidth, string> = {
	12: "Full width",
	8: "Two thirds",
	6: "Half",
	4: "One third",
	3: "One quarter",
};

/** The collapsible's key, prefixed like the shared fields so a type's settings can't clash with it. */
const MORE_KEY = "fieldMore";

/**
 * Creates the builder brick editors add a field of this type with. What every field needs comes
 * first, then the type's own settings, then the optional extras, folded away when there are
 * several.
 */
const createFieldBrick = (type: FormFieldTypeDefinition) => {
	const without = type.without ?? [];

	const layout: ContentFieldNode[] = [];
	if (!without.includes("width")) {
		layout.push(
			field.select(brickFields.width, {
				details: { label: copy("admin:plugin.forms.brick.width.label") },
				options: fieldWidths.map((width) => ({
					label: copy(`admin:plugin.forms.brick.width.${width}`, {
						defaultMessage: widthLabels[width],
					}),
					value: String(width),
				})),
				default: "12",
				validation: { required: true },
				ui: { width: 6 },
			}),
		);
	}
	if (!without.includes("required")) {
		layout.push(
			field.checkbox(brickFields.required, {
				details: { label: copy("admin:plugin.forms.brick.required.label") },
				ui: { width: 6 },
			}),
		);
	}

	const hasPlaceholder = !without.includes("placeholder");
	const hasDefaultValue = !without.includes("defaultValue");
	//* a pair sits side by side, and one alone takes the row
	const hintWidth = hasPlaceholder && hasDefaultValue ? 6 : 12;
	const extras: ContentFieldNode[] = [];
	if (hasPlaceholder) {
		extras.push(
			field.text(brickFields.placeholder, {
				details: { label: copy("admin:plugin.forms.brick.placeholder.label") },
				localized: true,
				ui: { width: hintWidth },
			}),
		);
	}
	if (hasDefaultValue) {
		extras.push(
			field.text(brickFields.defaultValue, {
				details: {
					label: copy("admin:plugin.forms.brick.default.value.label"),
				},
				localized: false,
				ui: { width: hintWidth },
			}),
		);
	}
	if (!without.includes("help")) {
		extras.push(
			field.text(brickFields.help, {
				details: {
					label: copy("admin:plugin.forms.brick.help.label"),
					description: copy("admin:plugin.forms.brick.help.description"),
				},
				localized: true,
			}),
		);
	}

	return defineBrick({
		key: `${FIELD_BRICK_PREFIX}${type.key}`,
		details: { label: type.label, description: type.description },
		fields: [
			field.text(brickFields.label, {
				details: { label: copy("admin:plugin.forms.brick.label.label") },
				localized: true,
				validation: { required: true },
				ui: { width: 6 },
			}),
			field.text(brickFields.name, {
				details: {
					label: copy("admin:plugin.forms.brick.name.label"),
					description: copy("admin:plugin.forms.brick.name.description"),
				},
				localized: false,
				validation: { required: true, zod: nameSchema },
				ui: { width: 6 },
			}),
			...layout,
			...(type.settings ?? []),
			...(extras.length > 1
				? [
						field.collapsible(MORE_KEY, {
							//* inline, so the extras read beside the brick's other fields
							output: "inline",
							defaultOpen: false,
							details: { label: copy("admin:plugin.forms.brick.more.label") },
							fields: extras,
						}),
					]
				: extras),
		],
	});
};

export default createFieldBrick;
