import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Claims an unexpired pending upload transactionally. Concurrent requests wait, then cannot claim
 * or touch the file. Rollback restores the claim.
 */
const claimAwaitingSync: ServiceFn<[{ key: string }], true> = async (
	context,
	data,
) => {
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const claimedRes = await MediaAwaitingSync.deleteSingle({
		where: [
			{ key: "key", operator: "=", value: data.key },
			{
				key: "timestamp",
				operator: ">",
				value: new Date(
					Date.now() - constants.mediaAwaitingSyncInterval,
				).toISOString(),
			},
		],
		returning: ["key"],
	});
	if (claimedRes.error) return claimedRes;

	if (claimedRes.data === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: copy("server:core.media.errors.not.awaiting.sync"),
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

export default claimAwaitingSync;
