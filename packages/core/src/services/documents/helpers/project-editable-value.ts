import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import type { RegisteredFieldDefinition } from "../../../libs/collection/custom-fields/types.js";
import type { DocumentShape } from "../../../libs/collection/helpers/get-document-shape.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

/** Formats authoring values for one locale, preserving nested refs so tools can submit the result for editing. */
const projectEditableValue = (
	shape: DocumentShape,
	value: unknown,
	locale: string | null,
): unknown => {
	switch (shape.kind) {
		case "value": {
			const { formatToolValue } = registeredFields[shape.field.type] as Pick<
				RegisteredFieldDefinition,
				"formatToolValue"
			>;
			return formatToolValue ? formatToolValue(value) : value;
		}
		case "object": {
			if (!isPlainObject(value)) return value;
			if (shape.localized) {
				const child = locale === null ? undefined : shape.children.get(locale);
				if (!child || locale === null) return value;

				return projectEditableValue(child, value[locale], locale);
			}

			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => {
					const childShape = shape.children.get(key);
					return [
						key,
						childShape
							? projectEditableValue(childShape, child, locale)
							: child,
					];
				}),
			);
		}
		case "items":
		case "bricks": {
			if (!Array.isArray(value)) return value;

			return value.map((item: unknown) => {
				if (!isPlainObject(item)) return item;
				const fields =
					shape.kind === "items"
						? shape.fields
						: typeof item.key === "string"
							? shape.fields.get(item.key)
							: undefined;

				return fields
					? {
							...item,
							fields: projectEditableValue(fields, item.fields, locale),
						}
					: item;
			});
		}
	}
};

export default projectEditableValue;
