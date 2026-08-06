import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms media rows exist before writes.
 */
const checkMediaAccess: ServiceFn<
	[
		{
			id?: number;
			ids?: number[];
		},
	],
	undefined
> = async (context, data) => {
	const ids = Array.from(
		new Set(data.ids ?? (data.id !== undefined ? [data.id] : [])),
	);

	if (ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultipleValidationData({
		ids,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data.length !== ids.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkMediaAccess;
