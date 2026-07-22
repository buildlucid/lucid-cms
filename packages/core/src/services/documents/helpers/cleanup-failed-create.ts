import type { LucidDocumentTableName } from "../../../libs/db/types.js";
import logger from "../../../libs/logger/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { documentWorkflowServices } from "../../index.js";

const cleanupFailedCreate: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			tableName: LucidDocumentTableName;
		},
	],
	undefined
> = async (context, data) => {
	if (context.db.client.isTransaction) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);
	const [deleteWorkflowRes, deleteDocumentRes] = await Promise.all([
		documentWorkflowServices.deleteForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.documentId],
		}),
		Documents.deleteSingle(
			{
				where: [
					{
						key: "id",
						operator: "=",
						value: data.documentId,
					},
				],
			},
			{
				tableName: data.tableName,
			},
		),
	]);

	if (deleteWorkflowRes.error || deleteDocumentRes.error) {
		logger.error({
			message: "Failed to clean up document after creation error",
			data: {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				workflowCleanupFailed: deleteWorkflowRes.error !== undefined,
				documentCleanupFailed: deleteDocumentRes.error !== undefined,
			},
		});
	}

	if (deleteWorkflowRes.error) return deleteWorkflowRes;
	if (deleteDocumentRes.error) return deleteDocumentRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default cleanupFailedCreate;
