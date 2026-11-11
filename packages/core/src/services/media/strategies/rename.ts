import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

/**
 * Renames a stored file, such as to change its visibility, and renames it back if the transaction
 * rolls back, so media never points at a key its file has left.
 */
const rename: ServiceFn<
	[
		{
			from: string;
			to: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const res = await mediaStorageRes.data.rename(context, {
		from: data.from,
		to: data.to,
	});
	if (res.error) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: res.error.message,
					},
				},
			},
			data: undefined,
		};
	}

	context.db.afterRollback(async () => {
		const renamedBack = await mediaStorageRes.data.rename(context, {
			from: data.to,
			to: data.from,
		});
		if (renamedBack.error) {
			logger.warn({
				message: "A media file couldn't be moved back after a rollback",
				scope: constants.logScopes.lucid,
				data: { key: data.to, reason: renamedBack.error.message },
			});
		}
	});

	return {
		error: undefined,
		data: undefined,
	};
};

export default rename;
