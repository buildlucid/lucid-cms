import { DeployRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Removes finished deploy runs after their retention period. */
const clearExpiredDeployRuns: ServiceFn<[], undefined> = async (context) => {
	const DeployRuns = new DeployRunsRepository(context.db);
	const deleted = await DeployRuns.deleteFinishedBefore(
		new Date(
			Date.now() - context.config.retention.deployRuns * 24 * 60 * 60 * 1000,
		).toISOString(),
	);
	if (deleted.error) return deleted;

	return { error: undefined, data: undefined };
};

export default clearExpiredDeployRuns;
