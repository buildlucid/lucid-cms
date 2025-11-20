import { DocumentsRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { LucidDocumentTableName } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Checks if the given single collection has more than one document
 */
const checkSingleCollectionDocumentCount: ServiceFn<
	[
		{
			collectionKey: string;
			collectionMode: "single" | "multiple";
			documentTable: LucidDocumentTableName;
			documentId?: number;
		},
	],
	undefined
> = async (context, data) => {
	//* early return if collection mode is multiple - no restrictions needed
	if (data.collectionMode === "multiple") {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Document = new DocumentsRepository(context.db, context.config.db);

	const existingDocumentRes = await Document.selectMultiple(
		{
			select: ["id"],
			where: [
				{
					key: "collection_key",
					operator: "=",
					value: data.collectionKey,
				},
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
			],
		},
		{
			tableName: data.documentTable,
		},
	);
	if (existingDocumentRes.error) return existingDocumentRes;

	//* check if there are documents besides the one being updated
	const hasOtherDocuments = existingDocumentRes.data?.some(
		(doc) => doc.id !== data.documentId,
	);
	if (hasOtherDocuments) {
		return {
			error: {
				type: "basic",
				message: T("this_collection_has_a_document_already"),
				status: 400,
				errors: {
					collectionKey: {
						code: "invalid",
						message: T("this_collection_has_a_document_already"),
					},
				},
			},
			data: undefined,
		};
	}
	return {
		error: undefined,
		data: undefined,
	};
};

export default checkSingleCollectionDocumentCount;
