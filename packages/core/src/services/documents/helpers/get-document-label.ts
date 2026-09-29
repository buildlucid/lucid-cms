import type { CollectionTableNames } from "../../../exports/types.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import {
	formatDocumentLabelValue,
	getDocumentLabelField,
} from "../../../libs/collection/helpers/document-label.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import { getDocumentFieldsTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

/** Reads the configured label for a document version, falling back to its collection name and ID. */
const getDocumentLabel = async (params: {
	context: ServiceContext;
	bricks: DocumentBricksRepository;
	collection: CollectionBuilder;
	tables: CollectionTableNames;
	documentId: number;
	versionId: number;
}): ServiceResponse<string> => {
	const fallbackLabel = () => {
		const labels = params.collection.getData.details.labels;
		const name =
			params.context.translate(labels.singular) ||
			params.context.translate(labels.plural) ||
			params.collection.key;
		return `${name} #${params.documentId}`;
	};
	const labelField = getDocumentLabelField(params.collection);
	if (!labelField) {
		return {
			error: undefined,
			data: fallbackLabel(),
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
			data: fallbackLabel(),
		};
	}

	const fieldsRes = await params.bricks.selectMultipleByVersionId(
		{
			versionId: params.versionId,
			documentId: params.documentId,
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
	const documentFields = fieldsRes.data?.[params.tables.documentFields] ?? [];
	const value = documentFields
		.map((field) => field[columnName])
		.map((value) => formatDocumentLabelValue(labelField, value))
		.find((value) => value !== null);

	return {
		error: undefined,
		data: value ?? fallbackLabel(),
	};
};

export default getDocumentLabel;
