import constants from "../../../../../constants/constants.js";
import type { FieldValidationInput } from "../../../../../services/documents-bricks/helpers/fetch-validation-data.js";
import T from "../../../../../translations/index.js";
import type {
	LucidDocumentTableName,
	ServiceContext,
} from "../../../../../types.js";
import logger from "../../../../logger/index.js";
import DocumentsRepository from "../../../../repositories/documents.js";
import buildTableName from "../../../helpers/build-table-name.js";
import type { DocumentValidationData } from "./types.js";

/**
 * Validate document input data
 */
const validateDocumentInputData = async (
	context: ServiceContext,
	input: FieldValidationInput,
): Promise<DocumentValidationData[]> => {
	const documentIdsByCollection = input.idsByCollection;
	const allDocuments: DocumentValidationData[] = [];
	try {
		//* create queries for each collection key
		const promises = Object.entries(documentIdsByCollection).map(
			([collectionKey, ids]) => {
				if (ids.length === 0) return Promise.resolve([]);

				const uniqueIds = [...new Set(ids)];
				return fetchDocumentsFromCollection(context, collectionKey, uniqueIds);
			},
		);

		const results = await Promise.all(promises);
		for (const documents of results) allDocuments.push(...documents);
		return allDocuments;
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_documents_for_validation"),
		});
		return [];
	}
};

/**
 * Fetch documents from a specific collection
 */
const fetchDocumentsFromCollection = async (
	context: ServiceContext,
	collectionKey: string,
	ids: number[],
): Promise<DocumentValidationData[]> => {
	if (ids.length === 0) return [];

	try {
		const tableNameRes = buildTableName<LucidDocumentTableName>(
			"document",
			{
				collection: collectionKey,
			},
			context.config.db.config.tableNameByteLimit,
		);
		if (tableNameRes.error) {
			logger.error({
				scope: constants.logScopes.validation,
				message: T("error_fetching_documents_from_collection", {
					collection: collectionKey,
				}),
			});
			return [];
		}

		const Document = new DocumentsRepository(
			context.db.client,
			context.config.db,
		);

		const documentIdRes = await Document.selectMultiple(
			{
				select: ["id"],
				where: [
					{
						key: "id",
						operator: "in",
						value: ids,
					},
				],
				validation: {
					enabled: true,
				},
			},
			{
				tableName: tableNameRes.data.name,
			},
		);
		if (documentIdRes.error) {
			logger.error({
				scope: constants.logScopes.validation,
				message: T("error_fetching_documents_from_collection", {
					collection: collectionKey,
				}),
			});
			return [];
		}

		return documentIdRes.data.map((doc) => ({
			id: doc.id,
			collection_key: collectionKey,
		}));
	} catch (_err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_documents_from_collection", {
				collection: collectionKey,
			}),
		});
		return [];
	}
};

export default validateDocumentInputData;
