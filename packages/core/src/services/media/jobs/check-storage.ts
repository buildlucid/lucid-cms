import z from "zod";
import constants from "../../../constants/constants.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import resolve from "../../notifications/resolve.js";
import upsert from "../../notifications/upsert.js";
import getStorageUsage from "../get-storage-usage.js";
import { storageNotification } from "../notifications.js";

/**
 * Compares media storage with its limit. Crossing a threshold notifies the
 * audience, climbing to a higher one notifies them again, and dropping below
 * the lowest resolves the notification.
 */
const checkStorage: JobHandler = async ({ context }) => {
	const storageLimit = context.config.media.limits.storageBytes;
	if (storageLimit === false) return { error: undefined, data: undefined };

	const usageRes = await getStorageUsage(context);
	if (usageRes.error) return usageRes;

	const storageUsed = usageRes.data.total;
	const percentUsed =
		storageLimit <= 0 ? 100 : (storageUsed / storageLimit) * 100;
	const threshold = constants.notifications.storage.thresholds
		.filter((candidate) => percentUsed >= candidate)
		.at(-1);

	if (threshold === undefined) {
		return resolve(context, {
			definition: storageNotification,
			key: constants.notifications.storage.key,
		});
	}

	const upsertRes = await upsert(context, {
		definition: storageNotification,
		key: constants.notifications.storage.key,
		fingerprint: String(threshold),
		data: {
			thresholdPercent: threshold,
			percentUsed: Math.floor(percentUsed),
			storageUsed,
			storageLimit,
			storageRemaining: Math.max(0, storageLimit - storageUsed),
		},
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export const checkStorageJob = defineJob({
	name: "core:check-storage",
	version: 1,
	input: z.null(),
	transaction: true,
	schedules: [
		{
			name: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: checkStorage,
});
