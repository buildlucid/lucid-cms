import Repository from "../../libs/repositories/index.js";
import constants from "../../constants/constants.js";
import { addMilliseconds } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Any media keys that have expired and still exist in the lucid_media_awaiting_sync table will be deleted along with the media using the delete service strategy.
 */
const deleteExpiredMedia: ServiceFn<[], undefined> = async (context) => {
	const MediaAwaitingSyncRepo = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const allExpiredMedia = await MediaAwaitingSyncRepo.selectMultiple({
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
	});
	if (allExpiredMedia.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	await mediaStrategyRes.data.deleteMultiple(allExpiredMedia.map((m) => m.key));
	await MediaAwaitingSyncRepo.deleteMultiple({
		where: [
			{
				key: "key",
				operator: "in",
				value: allExpiredMedia.map((m) => m.key),
			},
		],
	});
	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredMedia;
