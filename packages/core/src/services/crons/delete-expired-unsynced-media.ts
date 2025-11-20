import { addMilliseconds } from "date-fns";
import constants from "../../constants/constants.js";
import { MediaAwaitingSyncRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all expired media keys that are still awaiting sync and queues them for deletion
 */
const deleteExpiredUnsyncedMedia: ServiceFn<[], undefined> = async (
	context,
) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
		context.config.db,
	);

	const allExpiredMediaRes = await MediaAwaitingSync.selectMultiple({
		select: ["key"],
		where: [
			{
				key: "timestamp",
				operator: "<",
				value: addMilliseconds(
					new Date(),
					constants.mediaAwaitingSyncInterval * -1,
				).toISOString(),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (allExpiredMediaRes.error) return allExpiredMediaRes;

	if (allExpiredMediaRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await context.queue.command.addBatch(
		"media:delete-unsynced",
		{
			payloads: allExpiredMediaRes.data.map((media) => ({
				key: media.key,
			})),
			serviceContext: context,
		},
	);
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredUnsyncedMedia;
