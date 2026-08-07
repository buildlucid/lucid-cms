import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type {
	InternalDocumentBrick,
	InternalDocumentField,
} from "../../../types.js";

/** Converts response fields into input fields and removes layout-only entries. */
const prepareFields = (fields: InternalDocumentField[]): FieldInputSchema[] => {
	const preparedFields: FieldInputSchema[] = [];

	for (const field of fields) {
		//* response types also include non-persisted layout fields
		if (isStorageMode(registeredFields[field.type].config.database, "ignore")) {
			continue;
		}

		const preparedField: FieldInputSchema = {
			key: field.key,
			type: field.type as FieldInputSchema["type"],
		};

		if (field.value !== undefined) preparedField.value = field.value;
		if (field.translations !== undefined) {
			preparedField.translations = { ...field.translations };
		}
		if (field.groups !== undefined) {
			preparedField.groups = field.groups.map((group) => ({
				ref: group.ref,
				order: group.order,
				open: group.open,
				fields: prepareFields(group.fields),
			}));
		}

		preparedFields.push(preparedField);
	}

	return preparedFields;
};

/** Converts persisted document content into a fresh document input payload. */
const prepareDuplicateContent = (data: {
	bricks: InternalDocumentBrick[];
	fields: InternalDocumentField[];
}): {
	bricks: BrickInputSchema[];
	fields: FieldInputSchema[];
} => ({
	bricks: data.bricks.map((brick) => ({
		ref: brick.ref,
		key: brick.key,
		order: brick.order,
		open: brick.open,
		type: brick.type,
		fields: prepareFields(brick.fields),
	})),
	fields: prepareFields(data.fields),
});

export default prepareDuplicateContent;
