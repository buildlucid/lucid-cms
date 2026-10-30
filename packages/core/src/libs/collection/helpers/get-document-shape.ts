import type BrickBuilder from "../builders/brick-builder/index.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import { getFieldBuilderState } from "../builders/field-builder/index.js";
import registeredFields, {
	fieldHooks,
} from "../custom-fields/registered-fields.js";
import { storageModes } from "../custom-fields/storage/index.js";
import type { FieldConfig, FieldTypes } from "../custom-fields/types.js";
import type { ContentAccess, FieldAccess } from "../field-access/types.js";
import resolveCollectionLocalization from "./resolve-collection-localization.js";

export type Owner = CollectionBuilder | BrickBuilder;
export type FieldTree = FieldConfig<FieldTypes>[];
export type DocumentObjectShape = {
	kind: "object";
	children: Map<string, DocumentShape>;
	/** Set for a localized field's values keyed by locale. */
	localized?: true;
};
export type DocumentShape =
	| DocumentObjectShape
	| {
			kind: "value";
			defaultValue: unknown;
			relation: boolean;
			field: FieldConfig<FieldTypes>;
			owner: Owner;
			/** Set when the actor can't change the value. */
			locked?: true;
	  }
	| {
			kind: "items";
			fields: DocumentObjectShape;
			/** Set when the actor can't add, remove or reorder items. */
			locked?: true;
	  }
	| {
			kind: "bricks";
			fields: Map<string, DocumentObjectShape>;
			embedded: boolean;
			/** Brick keys the actor can't add, change or remove. */
			locked?: ReadonlySet<string>;
	  };

export type ContentContext = {
	collection: CollectionBuilder;
	localization: Parameters<
		typeof resolveCollectionLocalization
	>[0]["localization"];
	/** Writer access that omits hidden fields and bricks from the shape and marks locked nodes. */
	access?: ContentAccess;
};

/** Models collection structure for merges, patches and generated types with objects for fields, groups and locales, repeater items, brick variants and indivisible compound values, omitting unreadable nodes and marking locks when `access` is supplied. */
export const getDocumentShape = (
	context: ContentContext,
): DocumentObjectShape => {
	const localization = resolveCollectionLocalization(context);
	const fieldsDocumentShape = (
		fields: FieldTree,
		owner: Owner,
		access: ReadonlyMap<string, FieldAccess> | undefined,
	): DocumentObjectShape => {
		const children = new Map<string, DocumentShape>();
		for (const field of fields) {
			const level = access?.get(field.key) ?? "editable";
			if (level === "hidden") continue;
			const locked = level === "locked" ? { locked: true as const } : {};

			const contentChildren = fieldHooks[field.type].contentChildren?.(field);
			if (contentChildren) {
				const nested = fieldsDocumentShape(
					contentChildren.fields,
					owner,
					access,
				);
				if (contentChildren.output === "inline") {
					for (const [key, value] of nested.children) children.set(key, value);
				} else children.set(field.key, nested);
				continue;
			}

			const storage =
				storageModes[registeredFields[field.type].config.database.mode];
			if (storage.mode === "tree-table") {
				children.set(field.key, {
					kind: "items",
					fields: fieldsDocumentShape(
						storage.getChildFieldConfigs(field) ?? [],
						owner,
						access,
					),
					...locked,
				});
				continue;
			}

			const instance = getFieldBuilderState(owner).fields.get(field.key);
			const value: DocumentShape = {
				kind: "value",
				field,
				owner,
				defaultValue: instance?.defaultValue ?? null,
				relation:
					storage.mode === "relation-table" &&
					"resource" in registeredFields[field.type].config,
				...locked,
			};
			children.set(
				field.key,
				localization.enabled && instance?.localizedEnabled
					? {
							kind: "object",
							localized: true,
							children: new Map(
								localization.locales.map((locale) => [locale, value]),
							),
						}
					: value,
			);
		}

		return { kind: "object", children };
	};

	const bricks = (type: "builder" | "fixed" | "embedded") =>
		(context.collection.config.bricks?.[type] ?? []).filter(
			(brick) =>
				type === "embedded" ||
				context.access?.bricks.get(brick.key)?.access !== "hidden",
		);
	const brickFields = (type: "builder" | "fixed" | "embedded") =>
		new Map(
			bricks(type).map((brick) => [
				brick.key,
				fieldsDocumentShape(
					brick.contentFieldTree,
					brick,
					context.access?.bricks.get(brick.key)?.fields,
				),
			]),
		);
	const lockedBricks = (type: "builder" | "embedded") => {
		const keys = bricks(type)
			.filter(
				(brick) =>
					(context.access?.bricks.get(brick.key)?.access ?? "editable") !==
					"editable",
			)
			.map((brick) => brick.key);
		return keys.length > 0 ? { locked: new Set(keys) } : {};
	};

	return {
		kind: "object",
		children: new Map([
			[
				"fields",
				fieldsDocumentShape(
					context.collection.contentFieldTree,
					context.collection,
					context.access?.fields,
				),
			],
			[
				"bricks",
				{
					kind: "object",
					children: new Map<string, DocumentShape>([
						["fixed", { kind: "object", children: brickFields("fixed") }],
						[
							"builder",
							{
								kind: "bricks",
								fields: brickFields("builder"),
								embedded: false,
								...lockedBricks("builder"),
							},
						],
						[
							"embedded",
							{
								kind: "bricks",
								fields: brickFields("embedded"),
								embedded: true,
								...lockedBricks("embedded"),
							},
						],
					]),
				},
			],
		]),
	};
};
