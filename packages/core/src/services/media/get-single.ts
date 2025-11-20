import T from "../../translations/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import { mediaFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	MediaResponse
> = async (context, data) => {
	const Media = new MediaRepository(context.db, context.config.db);

	const mediaRes = await Media.selectSingleById({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: T("media_not_found_message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: mediaFormatter.formatSingle({
			media: mediaRes.data,
			host: context.config.host,
			urlStrategy: context.config.media.urlStrategy,
		}),
	};
};

export default getSingle;
