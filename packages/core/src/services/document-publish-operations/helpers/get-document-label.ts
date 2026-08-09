import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import {
	formatDocumentLabelValue,
	getDocumentFallbackLabel,
	getDocumentLabelField,
} from "../../../libs/collection/helpers/document-label.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import { getDocumentFieldsTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type { CollectionTableNames } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

/** Resolves the document label snapshot stored on publish operation events. */
const getDocumentLabel = async (params: {
	context: ServiceContext;
	bricks: DocumentBricksRepository;
	collection: CollectionBuilder;
	tables: CollectionTableNames;
	operation: {
		document_id: number;
		source_version_id: number;
	};
}): ServiceResponse<string | null> => {
	const labelField = getDocumentLabelField(params.collection);
	if (!labelField) {
		return {
			error: undefined,
			data: getDocumentFallbackLabel(
				params.collection,
				params.operation.document_id,
			),
		};
	}

	const documentFieldsTableSchemaRes = await getDocumentFieldsTableSchema(
		params.context,
		params.collection.key,
	);
	if (documentFieldsTableSchemaRes.error) return documentFieldsTableSchemaRes;
	if (!documentFieldsTableSchemaRes.data) {
		return {
			error: undefined,
			data: getDocumentFallbackLabel(
				params.collection,
				params.operation.document_id,
			),
		};
	}

	const fieldsRes = await params.bricks.selectMultipleByVersionId(
		{
			versionId: params.operation.source_version_id,
			documentId: params.operation.document_id,
			bricksSchema: [
				{
					name: params.tables.documentFields,
					columns: documentFieldsTableSchemaRes.data.columns,
				},
			],
		},
		{
			tableName: params.tables.version,
		},
	);
	if (fieldsRes.error) return fieldsRes;

	const columnName = prefixGeneratedColName(labelField.key);
	const documentFields = (fieldsRes.data?.[params.tables.documentFields] ??
		[]) as Array<Record<string, unknown>>;
	const value = documentFields
		.map((field) => field[columnName])
		.map((value) => formatDocumentLabelValue(labelField, value))
		.find((value) => value !== null);

	return {
		error: undefined,
		data:
			value ??
			getDocumentFallbackLabel(params.collection, params.operation.document_id),
	};
};

export default getDocumentLabel;
