import { LocalesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRetentionDays from "./helpers/get-retention-days.js";

/**
 * Finds all expired locales and queues them for deletion
 */
const clearExpiredLocales: ServiceFn<[], undefined> = async (context) => {
	const Locales = new LocalesRepository(context.db, context.config.db);

	const compDate = getRetentionDays(context.config.softDelete, "locales");

	const expiredLocalesRes = await Locales.selectMultiple({
		select: ["code"],
		where: [
			{
				key: "is_deleted_at",
				operator: "<",
				value: compDate,
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

	const queueRes = await context.queue.command.addBatch("locales:delete", {
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
