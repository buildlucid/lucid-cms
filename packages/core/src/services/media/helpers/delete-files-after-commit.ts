import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Deletes replaced files and cleared variants after commit to preserve files on rollback. Logs
 * deletion failures, leaving unused files.
 */
const deleteFilesAfterCommit = async (
	context: ServiceContext,
	keys: string[],
) => {
	const storage = context.mediaStorage;
	if (!storage || keys.length === 0) return;

	await context.db.afterCommit(async () => {
		const deleted = await storage.deleteMultiple(context, { keys });
		if (deleted.error) {
			logger.warn({
				message: "Media files couldn't be removed from storage",
				scope: constants.logScopes.lucid,
				data: { keys, reason: deleted.error.message },
			});
		}
	});
};

export default deleteFilesAfterCommit;
