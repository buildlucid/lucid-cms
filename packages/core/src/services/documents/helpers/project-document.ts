import z from "zod";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import type {
	FieldConfig,
	FieldTypes,
	RegisteredFieldDefinition,
} from "../../../libs/collection/custom-fields/types.js";
import type { DocumentRoute } from "../../../types/response.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

/** The route returned by document tools after locale projection. */
export const documentRouteSchema = z
	.object({
		path: z.union([
			z.string().nullable(),
			z.record(z.string(), z.string().nullable()),
		]),
		label: z.union([z.string().nullable(), z.record(z.string(), z.string())]),
	})
	.nullable()
	.meta({ description: "Resolved public path and label, when routed." });

/** Version and audit metadata, returned when documents_get includes meta. */
export const documentMetaSchema = z.object({
	versionId: z.number().nullable(),
	versions: z.record(z.string(), z.looseObject({}).nullable()),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	createdBy: z.number().nullable(),
	updatedBy: z.number().nullable(),
});

/** Referenced documents, media and users grouped by resource. */
export const documentRefsSchema = z.partialRecord(
	z.enum(["documents", "media", "users"]),
	z.array(z.unknown()),
);

/** Keeps only the requested top-level fields, or every field when none are requested. */
export const selectFields = (
	fields: Record<string, unknown>,
	keys?: readonly string[],
): Record<string, unknown> =>
	keys
		? Object.fromEntries(
				keys.filter((key) => key in fields).map((key) => [key, fields[key]]),
			)
		: fields;

/** Route paths are already resolved CMS paths; only select their locale value. */
export const projectRoute = (
	route: DocumentRoute | null,
	locale: string | null,
) => {
	if (!route || !locale) return route;
	return {
		path:
			typeof route.path === "string"
				? route.path
				: (route.path[locale] ?? null),
		label:
			typeof route.label === "string"
				? route.label
				: (route.label[locale] ?? null),
	};
};

/** Projects fields to one locale using their schema and `formatToolValue`, keeping JSON values distinct from translations. */
export const projectFieldMap = (
	fields: Record<string, unknown>,
	locale: string | null,
	fieldTree: FieldConfig<FieldTypes>[],
): Record<string, unknown> => {
	const result = { ...fields };
	for (const field of fieldTree) {
		const value = result[field.key];
		if (field.type === "section" || field.type === "collapsible") {
			if (field.output === "inline") {
				Object.assign(result, projectFieldMap(result, locale, field.fields));
			} else if (isPlainObject(value)) {
				result[field.key] = projectFieldMap(value, locale, field.fields);
			}
			continue;
		}

		if (field.type === "repeater") {
			if (Array.isArray(value)) {
				result[field.key] = value.map((group: unknown) =>
					isPlainObject(group)
						? projectFieldMap(group, locale, field.fields)
						: group,
				);
			}
			continue;
		}

		if (value === undefined) continue;
		const localized =
			locale !== null &&
			"localized" in field &&
			field.localized === true &&
			isPlainObject(value)
				? (value[locale] ?? null)
				: value;
		const { formatToolValue } = registeredFields[field.type] as Pick<
			RegisteredFieldDefinition,
			"formatToolValue"
		>;
		result[field.key] = formatToolValue
			? formatToolValue(localized)
			: localized;
	}
	return result;
};
