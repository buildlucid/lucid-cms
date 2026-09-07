import type BrickBuilder from "../builders/brick-builder/index.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import { getFieldBuilderState } from "../builders/field-builder/index.js";
import registeredFields from "../custom-fields/registered-fields.js";
import { storageModes } from "../custom-fields/storage/index.js";
import type { FieldConfig, FieldTypes } from "../custom-fields/types.js";
import resolveCollectionLocalization from "./resolve-collection-localization.js";

export type Owner = CollectionBuilder | BrickBuilder;
export type FieldTree = FieldConfig<FieldTypes>[];
export type DocumentObjectShape = {
	kind: "object";
	children: Map<string, DocumentShape>;
};
export type DocumentShape =
	| DocumentObjectShape
	| {
			kind: "value";
			defaultValue: unknown;
			relation: boolean;
			field: FieldConfig<FieldTypes>;
			owner: Owner;
	  }
	| { kind: "items"; fields: DocumentObjectShape }
	| {
			kind: "bricks";
			fields: Map<string, DocumentObjectShape>;
			embedded: boolean;
	  };

export type ContentContext = {
	collection: CollectionBuilder;
	localization: Parameters<
		typeof resolveCollectionLocalization
	>[0]["localization"];
};

/**
 * Describes the authoring structure shared by document merges, patches and generated types.
 * Objects represent fields, structural groups and locale maps. Items represent repeaters;
 * bricks describe the allowed brick variants. Value nodes keep compound fields indivisible.
 * This describes the collection, rather than storing a particular document's values.
 */
export const getDocumentShape = (
	context: ContentContext,
): DocumentObjectShape => {
	const localization = resolveCollectionLocalization(context);
	const fieldsDocumentShape = (
		fields: FieldTree,
		owner: Owner,
	): DocumentObjectShape => {
		const children = new Map<string, DocumentShape>();
		for (const field of fields) {
			if (
				field.type === "tab" ||
				field.type === "section" ||
				field.type === "collapsible"
			) {
				const nested = fieldsDocumentShape(field.fields, owner);
				if (field.type === "tab" || field.output === "inline") {
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
					),
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
			};
			children.set(
				field.key,
				localization.enabled && instance?.localizedEnabled
					? {
							kind: "object",
							children: new Map(
								localization.locales.map((locale) => [locale, value]),
							),
						}
					: value,
			);
		}

		return { kind: "object", children };
	};

	const brickFields = (type: "builder" | "fixed" | "embedded") =>
		new Map(
			(context.collection.config.bricks?.[type] ?? []).map((brick) => [
				brick.key,
				fieldsDocumentShape(brick.contentFieldTree, brick),
			]),
		);

	return {
		kind: "object",
		children: new Map([
			[
				"fields",
				fieldsDocumentShape(
					context.collection.contentFieldTree,
					context.collection,
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
							},
						],
						[
							"embedded",
							{
								kind: "bricks",
								fields: brickFields("embedded"),
								embedded: true,
							},
						],
					]),
				},
			],
		]),
	};
};
