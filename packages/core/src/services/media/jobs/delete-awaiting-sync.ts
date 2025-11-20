import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";

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
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
		context.config.db,
	);

	await mediaStrategyRes.data.services.delete(data.key);

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
