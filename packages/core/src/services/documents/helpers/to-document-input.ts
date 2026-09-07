import z from "zod";
import { getFieldBuilderState } from "../../../libs/collection/builders/field-builder/index.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { storageModes } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	ContentContext,
	FieldTree,
	Owner,
} from "../../../libs/collection/helpers/get-document-shape.js";
import resolveCollectionLocalization from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../../libs/i18n/index.js";
import { documentGroupSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type { DocumentEditableData } from "../../../libs/toolkit/documents/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import readDocumentObject from "./read-document-object.js";

/** Converts authoring values to the full payload used by admin document saves. */
const toDocumentInput = (
	context: ContentContext,
	data: DocumentEditableData,
	previous?: { fields: FieldInputSchema[]; bricks: BrickInputSchema[] },
): Awaited<
	ServiceResponse<{ fields: FieldInputSchema[]; bricks: BrickInputSchema[] }>
> => {
	const localization = resolveCollectionLocalization(context);
	const fieldsInput = (
		tree: FieldTree,
		owner: Owner,
		values: Record<string, unknown>,
		prior: FieldInputSchema[] = [],
	): Awaited<ServiceResponse<FieldInputSchema[]>> => {
		const fields: FieldInputSchema[] = [];
		for (const field of tree) {
			if (
				field.type === "tab" ||
				field.type === "section" ||
				field.type === "collapsible"
			) {
				const nested = readDocumentObject(
					field.type === "tab" || field.output === "inline"
						? values
						: values[field.key],
					field.key,
				);
				if (nested.error) return nested;

				const children = fieldsInput(field.fields, owner, nested.data, prior);
				if (children.error) return children;

				fields.push(...children.data);
				continue;
			}

			const storage =
				storageModes[registeredFields[field.type].config.database.mode];
			if (storage.mode === "tree-table") {
				const parsed = z
					.array(documentGroupSchema.required({ ref: true }))
					.safeParse(values[field.key]);
				if (!parsed.success) {
					return {
						error: {
							status: 400,
							message: copy("server:core.documents.authoring.items.invalid", {
								data: { key: field.key },
							}),
							zod: parsed.error,
						},
						data: undefined,
					};
				}

				const priorGroups = prior.find(
					(item) => item.key === field.key,
				)?.groups;
				const groups: NonNullable<FieldInputSchema["groups"]> = [];
				for (const [order, group] of parsed.data.entries()) {
					const previous = priorGroups?.find((item) => item.ref === group.ref);
					const children = fieldsInput(
						storage.getChildFieldConfigs(field) ?? [],
						owner,
						group.fields,
						previous?.fields,
					);
					if (children.error) return children;

					groups.push({
						ref: group.ref,
						order,
						open: previous?.open,
						fields: children.data,
					});
				}

				fields.push({ key: field.key, type: field.type, groups });
				continue;
			}

			const instance = getFieldBuilderState(owner).fields.get(field.key);
			const value = values[field.key];
			if (localization.enabled && instance?.localizedEnabled) {
				const translations = readDocumentObject(value, field.key);
				if (translations.error) return translations;

				fields.push({
					key: field.key,
					type: field.type,
					translations: translations.data,
				});
			} else {
				fields.push({ key: field.key, type: field.type, value });
			}
		}

		return { error: undefined, data: fields };
	};

	const bricks: BrickInputSchema[] = [];
	for (const brick of context.collection.config.bricks?.fixed ?? []) {
		const prior = previous?.bricks.find(
			(item) => item.type === "fixed" && item.key === brick.key,
		);
		const fields = fieldsInput(
			brick.contentFieldTree,
			brick,
			data.bricks.fixed[brick.key] ?? {},
			prior?.fields,
		);
		if (fields.error) return fields;

		bricks.push({
			ref: prior?.ref ?? `fixed:${brick.key}`,
			open: prior?.open,
			key: brick.key,
			type: "fixed",
			order: bricks.length,
			fields: fields.data,
		});
	}

	for (const type of ["builder", "embedded"] as const) {
		for (const [order, item] of data.bricks[type].entries()) {
			const brick = context.collection.config.bricks?.[type]?.find(
				(brick) => brick.key === item.key,
			);
			if (!brick) {
				return {
					error: {
						status: 400,
						message: copy("server:core.documents.authoring.brick.unknown", {
							data: { type, key: item.key },
						}),
					},
					data: undefined,
				};
			}

			const prior = previous?.bricks.find(
				(value) => value.type === type && value.ref === item.ref,
			);
			const fields = fieldsInput(
				brick.contentFieldTree,
				brick,
				item.fields,
				prior?.fields,
			);
			if (fields.error) return fields;

			bricks.push({
				...item,
				type,
				order,
				open: prior?.open,
				fields: fields.data,
			});
		}
	}

	const fields = fieldsInput(
		context.collection.contentFieldTree,
		context.collection,
		data.fields,
		previous?.fields,
	);
	if (fields.error) return fields;

	return { error: undefined, data: { fields: fields.data, bricks } };
};

export default toDocumentInput;
