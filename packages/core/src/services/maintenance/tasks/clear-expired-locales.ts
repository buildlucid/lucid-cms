import { enqueueJobs } from "../../../libs/jobs/enqueue.js";
import { LocalesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { deleteLocaleJob } from "../../locales/jobs/delete-single.js";

/** Queues expired locales for deletion. */
const clearExpiredLocales: ServiceFn<[], undefined> = async (context) => {
	const Locales = new LocalesRepository(context.db);

	const compDate = new Date(
		Date.now() - context.config.retention.removedLocales * 24 * 60 * 60 * 1000,
	).toISOString();

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

	const queueRes = await enqueueJobs(context, {
		job: deleteLocaleJob,
		payload: expiredLocalesRes.data.map((locale) => ({
			localeCode: locale.code,
		})),
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredLocales;
