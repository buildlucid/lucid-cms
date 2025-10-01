import { subDays } from "date-fns";
import constants from "../../constants/constants.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all expired locales and queues them for deletion
 */
const clearExpiredLocales: ServiceFn<[], undefined> = async (context) => {
	const Locales = Repository.get("locales", context.db, context.config.db);

	const now = new Date();
	const thirtyDaysAgo = subDays(now, constants.retention.deletedLocales);
	const thirtyDaysAgoTimestamp = thirtyDaysAgo.toISOString();

	const expiredLocalesRes = await Locales.selectMultiple({
		select: ["code"],
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
		validation: {
			enabled: true,
		},
	});
	if (expiredLocalesRes.error) return expiredLocalesRes;

	if (expiredLocalesRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await context.queue.addBatch("locales:delete", {
		payloads: expiredLocalesRes.data.map((locale) => ({
			localeCode: locale.code,
		})),
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredLocales;
