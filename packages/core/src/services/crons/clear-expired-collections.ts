import { subDays } from "date-fns";
import logger from "../../utils/logging/index.js";
import constants from "../../constants/constants.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * After 30 days of inactivity, non-active collections will be deleted from the database.
 * @todo Expose the retention time?
 */
const clearExpiredCollections: ServiceFn<[], undefined> = async (context) => {
	const CollectionsRepo = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const now = new Date();
	const thirtyDaysAgo = subDays(now, constants.retention.deletedCollections);
	const thirtyDaysAgoTimestamp = thirtyDaysAgo.toISOString();

	const res = await CollectionsRepo.deleteMultiple({
		where: [
			{
				key: "is_deleted_at",
				operator: "<",
				value: thirtyDaysAgoTimestamp,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.config.defaults.boolean.true,
			},
		],
	});

	logger("debug", {
		message: `The following ${res.length} collections have been deleted: ${res.map((c) => c.key).join(", ")}`,
		scope: constants.logScopes.cron,
	});

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredCollections;
