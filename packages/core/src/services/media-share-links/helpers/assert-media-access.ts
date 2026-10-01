import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import { getMediaOwnership } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Ensures share-link operations only run for existing library media, so
 * personal and system files can never be shared by link.
 */
const assertMediaAccess: ServiceFn<
	[
		{
			mediaId: number;
		},
	],
	undefined
> = async (context, props) => {
	const Media = new MediaRepository(context.db);

	const mediaRes = await Media.selectSingleById({
		id: props.mediaId,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	if (getMediaOwnership(mediaRes.data).type !== "library") {
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

export default assertMediaAccess;
