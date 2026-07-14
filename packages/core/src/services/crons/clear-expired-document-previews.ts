import { DocumentPreviewsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Deletes expired document preview rows.
 */
const clearExpiredDocumentPreviews: ServiceFn<[], undefined> = async (
	context,
) => {
	const DocumentPreviews = new DocumentPreviewsRepository(
		context.db.client,
		context.config.db,
	);

	const clearRes = await DocumentPreviews.deleteMultiple({
		where: [
			{
				key: "expires_at",
				operator: "<=",
				value: new Date().toISOString(),
			},
		],
	});
	if (clearRes.error) return clearRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredDocumentPreviews;
