import type { LucidDocumentTableName } from "../../../libs/db/tables/index.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import deleteDocumentRecords from "./delete-document-records.js";

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
	if (context.db.isTransaction) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const deleted = await deleteDocumentRecords(context, {
		collectionKey: data.collectionKey,
		documentIds: [data.documentId],
		tableName: data.tableName,
	});
	if (deleted.error) {
		logger.error({
			message: "Failed to clean up document after creation error",
			data: { collectionKey: data.collectionKey, documentId: data.documentId },
		});
		return deleted;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default cleanupFailedCreate;
