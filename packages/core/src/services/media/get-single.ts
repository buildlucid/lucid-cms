import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaFormatter = Formatter.get("media");

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
		data: MediaFormatter.formatSingle({
			media: mediaRes.data,
			host: context.config.host,
		}),
	};
};

export default getSingle;
