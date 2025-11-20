import { addMilliseconds } from "date-fns";
import constants from "../../../constants/constants.js";
import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Checks if the given media key exists within the lucid_media_awaiting_sync table and if it has not expired.
 *
 * If it has expired or does not exist, this means the item has either already been created or deleted.
 */
const checkAwaitingSync: ServiceFn<
	[
		{
			key: string;
		},
	],
	true
> = async (context, data) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
		context.config.db,
	);

	const awaitingSyncRes = await MediaAwaitingSync.selectSingle({
		select: ["key"],
		where: [
			{
				key: "key",
				operator: "=",
				value: data.key,
			},
			{
				key: "timestamp",
				operator: ">",
				value: addMilliseconds(
					new Date(),
					constants.mediaAwaitingSyncInterval * -1,
				).toISOString(),
			},
		],
	});
	if (awaitingSyncRes.error) return awaitingSyncRes;

	if (awaitingSyncRes.data === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: T("media_error_not_awaiting_sync"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: true,
	};
};

export default checkAwaitingSync;
