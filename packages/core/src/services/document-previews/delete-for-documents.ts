import { DocumentPreviewsRepository } from "../../libs/repositories/index.js";
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
		return {
			error: undefined,
			data: undefined,
		};
	}

	const DocumentPreviews = new DocumentPreviewsRepository(
		context.db.client,
		context.config.db,
	);

	const deleteRes = await DocumentPreviews.deleteMultiple({
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "in", value: data.documentIds },
		],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteForDocuments;
