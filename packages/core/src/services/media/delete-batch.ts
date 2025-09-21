import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			mediaIds: number[];
			folderIds: number[];
			recursiveMedia: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
