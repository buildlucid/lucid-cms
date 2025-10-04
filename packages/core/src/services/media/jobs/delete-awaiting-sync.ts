import Repository from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import services from "../../index.js";

/**
 * Deletes expired media that is still awaiting sync
 */
const deleteAwaitingSyncMedia: ServiceFn<
	[
		{
			key: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes = services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const MediaAwaitingSync = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	await mediaStrategyRes.data.deleteSingle(data.key);

	const deleteRes = await MediaAwaitingSync.deleteSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: data.key,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteAwaitingSyncMedia;
