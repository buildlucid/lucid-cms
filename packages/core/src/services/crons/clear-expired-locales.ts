import { subDays } from "date-fns";
import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * After 30 days of inactivity, non-active locales will be deleted from the database.
 *  @todo Expose the retention time?
 */
const clearExpiredLocales: ServiceFn<[], undefined> = async (context) => {
	const Locales = Repository.get("locales", context.db, context.config.db);

	const now = new Date();
	const thirtyDaysAgo = subDays(now, constants.retention.deletedLocales);
	const thirtyDaysAgoTimestamp = thirtyDaysAgo.toISOString();

	const deleteRes = await Locales.deleteMultiple({
		where: [
			{
				key: "is_deleted_at",
				operator: "<",
				value: thirtyDaysAgoTimestamp,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
		],
		returning: ["code"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	logger.debug({
		message: `The following ${deleteRes.data.length} locales have been deleted: ${deleteRes.data.map((l) => l.code).join(", ")}`,
		scope: constants.logScopes.cron,
	});

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredLocales;
