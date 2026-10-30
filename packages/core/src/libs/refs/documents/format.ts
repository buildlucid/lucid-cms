import type { RefResourceMap } from "../../../exports/types.js";
import filterReadableContent from "../../collection/field-access/filter-readable-content.js";
import getContentAccess from "../../collection/field-access/get-content-access.js";
import resolveCollectionLocalization from "../../collection/helpers/resolve-collection-localization.js";
import documentBricksFormatter from "../../formatters/document-bricks.js";
import documentFieldsFormatter from "../../formatters/document-fields.js";
import formatDocumentRoute from "../../formatters/document-route.js";
import type { DocumentRefData, DocumentRefFormatContext } from "./types.js";

const formatDocumentRefs = (
	data: DocumentRefData,
	context: DocumentRefFormatContext,
): RefResourceMap["documents"][] =>
	data.rows.map((document) => {
		const targetCollectionKey = document.collection_key;
		const collection = context.collections.find(
			(item) => item.key === targetCollectionKey,
		);
		const targetBricksSchema =
			targetCollectionKey === context.collection.key
				? context.bricksTableSchema
				: data.fieldsSchemaByCollection[targetCollectionKey]
					? [data.fieldsSchemaByCollection[targetCollectionKey]]
					: undefined;

		if (!collection || !targetBricksSchema) {
			return {
				id: document.document_id,
				versionId: document.id,
				collectionKey: targetCollectionKey,
				route: null,
				fields: null,
			};
		}

		const formattedFields = documentBricksFormatter.formatDocumentFields({
			bricksQuery: document,
			bricksSchema: targetBricksSchema,
			collection,
			config: context.config,
			host: context.host,
		});
		const readableFields =
			context.reader === undefined
				? formattedFields
				: (filterReadableContent(getContentAccess(collection, context.reader), {
						fields: formattedFields,
					}).fields ?? []);
		const documentFields = context.flattenDocumentFields
			? documentFieldsFormatter.flattenFields(
					readableFields,
					collection.contentFieldTree,
				)
			: documentFieldsFormatter.objectifyFields(readableFields);
		const localization = resolveCollectionLocalization({
			localization: context.config.localization,
			collection,
		});

		return {
			id: document.document_id,
			versionId: document.id,
			collectionKey: targetCollectionKey,
			route: formatDocumentRoute({
				collection,
				documentId: document.document_id,
				fields: formattedFields,
				locales: localization.locales,
			}),
			fields: Object.keys(documentFields).length > 0 ? documentFields : null,
		} satisfies RefResourceMap["documents"];
	});

export default formatDocumentRefs;
