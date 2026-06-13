import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Ensures share-link operations only run for media visible in the current tenant scope.
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
		tenantKey: context.request.tenantKey,
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
