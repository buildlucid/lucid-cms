import type { LucidDocumentTableName } from "../../../libs/db/tables/index.js";
import {
	DocumentIdentitiesRepository,
	DocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Permanently removes document rows and their identities. Callers own the transaction and lifecycle actions. */
const deleteDocumentRecords: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
			tableName: LucidDocumentTableName;
		},
	],
	undefined
> = async (context, { collectionKey, documentIds, tableName }) => {
	if (!documentIds.length) return { error: undefined, data: undefined };

	const documents = await new DocumentsRepository(context.db).deleteMultiple(
		{
			where: [{ key: "id", operator: "in", value: documentIds }],
		},
		{ tableName },
	);
	if (documents.error) return documents;

	const DocumentIdentities = new DocumentIdentitiesRepository(context.db);
	const identities = await DocumentIdentities.deleteMultiple({
		where: [
			{ key: "collection_key", operator: "=", value: collectionKey },
			{ key: "document_id", operator: "in", value: documentIds },
		],
	});
	if (identities.error) return identities;

	return { error: undefined, data: undefined };
};

export default deleteDocumentRecords;
