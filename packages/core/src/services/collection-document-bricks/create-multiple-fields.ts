import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	CFInsertItem,
	FieldTypes,
} from "../../libs/custom-fields/types.js";

const createMultipleFields: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			fields: CFInsertItem<FieldTypes>[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.fields.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const CollectionDocumentFieldsRepo = Repository.get(
		"collection-document-fields",
		context.db,
		context.config.db,
	);

	await CollectionDocumentFieldsRepo.createMultiple({
		items: data.fields.map((field) => {
			return {
				collectionDocumentId: data.documentId,
				collectionDocumentVersionId: data.versionId,
				collectionBrickId: field.collectionBrickId,
				key: field.key,
				type: field.type,
				groupId: field.groupId,
				textValue: field.textValue ?? null,
				intValue: field.intValue ?? null,
				boolValue: field.boolValue ?? null,
				jsonValue: field.jsonValue ?? null,
				mediaId: field.mediaId ?? null,
				documentId: field.documentId ?? null,
				userId: field.userId ?? null,
				localeCode: field.localeCode,
			};
		}),
	});

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultipleFields;
