import Repository from "../../libs/repositories/index.js";
import constants from "../../constants/constants.js";
import { addMilliseconds } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Any media keys that have expired and still exist in the lucid_media_awaiting_sync table will be deleted along with the media using the delete service strategy.
 */
const deleteExpiredMedia: ServiceFn<[], undefined> = async (context) => {
	const MediaAwaitingSync = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

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

	await mediaStrategyRes.data.deleteMultiple(
		allExpiredMediaRes.data.map((m) => m.key),
	);
	const deleteMultipleRes = await MediaAwaitingSync.deleteMultiple({
		where: [
			{
				key: "key",
				operator: "in",
				value: allExpiredMediaRes.data.map((m) => m.key),
			},
		],
	});
	if (deleteMultipleRes.error) return deleteMultipleRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredMedia;
