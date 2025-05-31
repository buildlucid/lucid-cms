import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { MediaResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
			localeCode: string;
		},
	],
	{
		data: MediaResponse[];
		count: number;
	}
> = async (context, data) => {
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaFormatter = Formatter.get("media");

	const mediaRes = await Media.selectMultipleFilteredFixed({
		localeCode: data.localeCode,
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			data: MediaFormatter.formatMultiple({
				media: mediaRes.data[0],
				host: context.config.host,
				urlStrategy: context.config.media.urlStrategy,
			}),
			count: Formatter.parseCount(mediaRes.data[1]?.count),
		},
	};
};

export default getMultiple;
