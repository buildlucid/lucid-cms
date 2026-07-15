import { PreviewSessionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Deletes expired preview sessions. */
const clearExpiredPreviewSessions: ServiceFn<[], undefined> = async (
	context,
) => {
	const PreviewSessions = new PreviewSessionsRepository(
		context.db.client,
		context.config.db,
	);

	const clearRes = await PreviewSessions.deleteMultiple({
		where: [
			{
				key: "expires_at",
				operator: "<=",
				value: new Date().toISOString(),
			},
		],
	});
	if (clearRes.error) return clearRes;

	return { error: undefined, data: undefined };
};

export default clearExpiredPreviewSessions;
