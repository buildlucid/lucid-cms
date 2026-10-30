import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { DocumentEditableData } from "../../toolkit/documents/types.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import { fieldHooks } from "../custom-fields/registered-fields.js";
import { storageModes } from "../custom-fields/storage/index.js";
import type { FieldConfig, FieldTypes } from "../custom-fields/types.js";
import getEmbeddedBrickAccess from "./get-embedded-brick-access.js";
import type { ContentAccess, FieldAccess } from "./types.js";

const filterFields = (
	tree: FieldConfig<FieldTypes>[],
	values: Record<string, unknown>,
	access: ReadonlyMap<string, FieldAccess>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const field of tree) {
		if (access.get(field.key) === "hidden") continue;

		const children = fieldHooks[field.type].contentChildren?.(field);
		if (children) {
			const nested = values[field.key];
			if (children.output === "inline") {
				Object.assign(result, filterFields(children.fields, values, access));
			} else if (isPlainObject(nested)) {
				result[field.key] = filterFields(children.fields, nested, access);
			}
			continue;
		}

		if (!(field.key in values)) continue;

		const value = values[field.key];
		const storage = storageModes[fieldHooks[field.type].config.database.mode];
		if (storage.mode !== "tree-table" || !Array.isArray(value)) {
			result[field.key] = value;
			continue;
		}

		const groupFields = storage.getChildFieldConfigs(field) ?? [];
		result[field.key] = value.map((group: unknown) =>
			isPlainObject(group) && isPlainObject(group.fields)
				? { ...group, fields: filterFields(groupFields, group.fields, access) }
				: group,
		);
	}
	return result;
};

/** Omits unreadable authoring fields and bricks for agent tools, using `stored` input to retain embedded bricks only when every referencing field is readable. */
const filterReadableData = (
	collection: CollectionBuilder,
	access: ContentAccess,
	data: DocumentEditableData,
	stored: { fields: FieldInputSchema[]; bricks: BrickInputSchema[] },
): DocumentEditableData => {
	if (!access.restricted) return data;

	const brickFields = (
		type: "fixed" | "builder" | "embedded",
		key: string,
		values: Record<string, unknown>,
	) => {
		const brick = collection.config.bricks?.[type]?.find(
			(definition) => definition.key === key,
		);
		const brickAccess = access.bricks.get(key);
		return brick && brickAccess
			? filterFields(brick.contentFieldTree, values, brickAccess.fields)
			: values;
	};
	const readable = (key: string) => access.bricks.get(key)?.access !== "hidden";
	const embeddedAccess = getEmbeddedBrickAccess(access, stored);

	return {
		fields: filterFields(
			collection.contentFieldTree,
			data.fields,
			access.fields,
		),
		bricks: {
			fixed: Object.fromEntries(
				Object.entries(data.bricks.fixed)
					.filter(([key]) => readable(key))
					.map(([key, values]) => [key, brickFields("fixed", key, values)]),
			),
			builder: data.bricks.builder
				.filter((brick) => readable(brick.key))
				.map((brick) => ({
					...brick,
					fields: brickFields("builder", brick.key, brick.fields),
				})),
			embedded: data.bricks.embedded
				.filter(
					(brick) => (embeddedAccess.get(brick.ref) ?? "hidden") !== "hidden",
				)
				.map((brick) => ({
					...brick,
					fields: brickFields("embedded", brick.key, brick.fields),
				})),
		},
	};
};

export default filterReadableData;
