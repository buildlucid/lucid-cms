import {
	documentBricksFormatter,
	documentFieldsFormatter,
} from "../../../../formatters/index.js";
import type { BrickQueryResponse } from "../../../../repositories/document-bricks.js";
import type { CFResponse, FieldRefParams } from "../../types.js";

const isBrickQueryResponse = (value: unknown): value is BrickQueryResponse => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "document_id" in value && "collection_key" in value;
};

const formatDocumentRef = (
	value: unknown,
	params: FieldRefParams,
): CFResponse<"document">["ref"] | null => {
	if (!isBrickQueryResponse(value)) return null;

	const targetCollectionKey = value.collection_key;
	const collection = params.config.collections.find(
		(c) => c.key === targetCollectionKey,
	);

	const targetBricksSchema =
		targetCollectionKey === params.collection.key
			? params.bricksTableSchema
			: params.documentRefMeta?.fieldsSchemaByCollection?.[targetCollectionKey]
				? [params.documentRefMeta.fieldsSchemaByCollection[targetCollectionKey]]
				: undefined;

	if (!collection || !targetBricksSchema) {
		return {
			id: value.document_id,
			versionId: value.id,
			collectionKey: targetCollectionKey,
			fields: null,
		};
	}

	const documentFields = documentFieldsFormatter.objectifyFields(
		documentBricksFormatter.formatDocumentFields({
			bricksQuery: value,
			bricksSchema: targetBricksSchema,
			refData: { data: {} },
			collection: collection,
			config: params.config,
			host: params.host,
		}),
	);

	return {
		id: value.document_id,
		versionId: value.id,
		collectionKey: targetCollectionKey,
		fields: Object.keys(documentFields).length > 0 ? documentFields : null,
	} satisfies CFResponse<"document">["ref"];
};

export default formatDocumentRef;
