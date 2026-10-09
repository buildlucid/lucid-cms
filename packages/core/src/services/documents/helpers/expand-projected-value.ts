import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import type { RegisteredFieldDefinition } from "../../../libs/collection/custom-fields/types.js";
import type { DocumentShape } from "../../../libs/collection/helpers/get-document-shape.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

/** Parses tool values for writes, wrapping localized fields while preserving supplied locale maps and unknown keys for validation. */
const expandProjectedValue = (
	shape: DocumentShape,
	value: unknown,
	locale: string | null,
): unknown => {
	switch (shape.kind) {
		case "value": {
			const { parseToolValue } = registeredFields[shape.field.type] as Pick<
				RegisteredFieldDefinition,
				"parseToolValue"
			>;
			return parseToolValue ? parseToolValue(value) : value;
		}
		case "object": {
			if (shape.localized) {
				const locales = isPlainObject(value) ? Object.entries(value) : [];
				const [first] = shape.children.values();
				//* JSON values are free-form, so only a single locale's value is accepted
				if (
					locales.length > 0 &&
					first?.kind === "value" &&
					first.field.type !== "json" &&
					locales.every(([key]) => shape.children.has(key))
				) {
					return Object.fromEntries(
						locales.map(([key, child]) => [
							key,
							expandProjectedValue(
								shape.children.get(key) ?? first,
								child,
								key,
							),
						]),
					);
				}

				const child = locale === null ? undefined : shape.children.get(locale);
				if (!child || locale === null) return value;

				return { [locale]: expandProjectedValue(child, value, locale) };
			}
			if (!isPlainObject(value)) return value;

			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => {
					const childShape = shape.children.get(key);
					return [
						key,
						childShape
							? expandProjectedValue(childShape, child, locale)
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
							fields: expandProjectedValue(fields, item.fields, locale),
						}
					: item;
			});
		}
	}
};

export default expandProjectedValue;
