import z from "zod";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type {
	FieldConfig,
	FieldTypes,
} from "../../../libs/collection/custom-fields/types.js";
import type {
	CollectionDocument,
	DocumentRoute,
} from "../../../types/response.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

type ContentBrick = NonNullable<CollectionDocument<string>["bricks"]>[number];

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

/** Uses the authoring field tree so ordinary JSON objects are never mistaken for translations. */
export const projectFieldMap = (
	fields: Record<string, unknown>,
	locale: string | null,
	fieldTree: FieldConfig<FieldTypes>[],
): Record<string, unknown> => {
	if (!locale) return fields;

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

		if (
			"localized" in field &&
			field.localized === true &&
			isPlainObject(value)
		) {
			result[field.key] = value[locale] ?? null;
		}
	}
	return result;
};

/** Projects brick fields to one content locale using each brick's field tree. */
export const projectDocumentBricks = (
	bricks: readonly ContentBrick[],
	locale: string | null,
	collection: CollectionBuilder,
) =>
	bricks.map((brick) => {
		const definition = collection.brickInstances.find(
			(candidate) => candidate.key === brick.key,
		);
		return definition
			? {
					...brick,
					fields: projectFieldMap(
						brick.fields,
						locale,
						definition.contentFieldTree,
					),
				}
			: brick;
	});
