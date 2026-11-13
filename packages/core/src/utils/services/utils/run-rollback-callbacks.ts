import constants from "../../../constants/constants.js";
import type { LucidDatabase } from "../../../libs/db/client/index.js";
import logger from "../../../libs/logger/index.js";

/** Runs a rolled-back transaction or savepoint's `afterRollback` work, logging a failure instead of throwing it. */
const runRollbackCallbacks = async (db: LucidDatabase) => {
	try {
		await db.runRollbackCallbacks();
	} catch (error) {
		logger.error({
			error,
			event: "db.after-rollback.failed",
			message: "Work queued to run after a rollback failed",
			scope: constants.logScopes.lucid,
		});
	}
};

export default runRollbackCallbacks;
