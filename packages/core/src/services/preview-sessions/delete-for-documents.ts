import { PreviewSessionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteForDocuments: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds.length === 0) {
		return { error: undefined, data: undefined };
	}

	const PreviewSessions = new PreviewSessionsRepository(
		context.db.client,
		context.config.db,
	);
	const deleteRes = await PreviewSessions.deleteMultiple({
		where: [
			{
				key: "entry_collection_key",
				operator: "=",
				value: data.collectionKey,
			},
			{
				key: "entry_document_id",
				operator: "in",
				value: data.documentIds,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: undefined };
};

export default deleteForDocuments;
