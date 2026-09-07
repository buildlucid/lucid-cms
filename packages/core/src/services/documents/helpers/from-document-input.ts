import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { storageModes } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	ContentContext,
	FieldTree,
} from "../../../libs/collection/helpers/get-document-shape.js";
import type { DocumentEditableData } from "../../../libs/toolkit/documents/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import mergeDocumentData from "./merge-document-data.js";

/** Converts stored fields without running content hooks or relation hydration. */
const fromDocumentInput = (
	context: ContentContext,
	input: { fields: FieldInputSchema[]; bricks: BrickInputSchema[] },
): Awaited<ServiceResponse<DocumentEditableData>> => {
	const fieldValues = (
		tree: FieldTree,
		values: FieldInputSchema[],
	): Record<string, unknown> => {
		const result: Record<string, unknown> = {};
		for (const field of tree) {
			if (
				field.type === "tab" ||
				field.type === "section" ||
				field.type === "collapsible"
			) {
				const child = fieldValues(field.fields, values);
				if (field.type === "tab" || field.output === "inline")
					Object.assign(result, child);
				else result[field.key] = child;
				continue;
			}
			const value = values.find((value) => value.key === field.key);
			if (!value) continue;
			const storage =
				storageModes[registeredFields[field.type].config.database.mode];
			result[field.key] =
				storage.mode === "tree-table"
					? (value.groups ?? []).map((group) => ({
							ref: group.ref,
							fields: fieldValues(
								storage.getChildFieldConfigs(field) ?? [],
								group.fields,
							),
						}))
					: (value.translations ?? value.value);
		}
		return result;
	};

	const data: DocumentEditableData = {
		fields: fieldValues(context.collection.contentFieldTree, input.fields),
		bricks: { fixed: {}, builder: [], embedded: [] },
	};

	for (const brick of input.bricks) {
		const definition = context.collection.config.bricks?.[brick.type]?.find(
			(definition) => definition.key === brick.key,
		);
		if (!definition) continue;
		const fields = fieldValues(definition.contentFieldTree, brick.fields ?? []);
		if (brick.type === "fixed") data.bricks.fixed[brick.key] = fields;
		else
			data.bricks[brick.type].push({ ref: brick.ref, key: brick.key, fields });
	}

	return mergeDocumentData(context, data);
};

export default fromDocumentInput;
