import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Ensures share-link operations only run for existing media.
 */
const assertMediaAccess: ServiceFn<
	[
		{
			mediaId: number;
		},
	],
	undefined
> = async (context, props) => {
	const Media = new MediaRepository(context.db.client, context.config.db);

	const mediaRes = await Media.selectSingleById({
		id: props.mediaId,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default assertMediaAccess;
