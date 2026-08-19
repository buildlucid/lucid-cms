import formatter, { mediaFormatter } from "../../libs/formatters/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type { Media } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: Media[];
		count: number;
	}
> = async (context, data) => {
	const Media = new MediaRepository(context.db);

	const mediaRes = await Media.selectMultipleFilteredFixed({
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			data: mediaFormatter.formatMultiple({
				media: mediaRes.data[0],
				options: {
					host: getBaseUrl(context),
					delivery: context.mediaDelivery,
				},
			}),
			count: formatter.parseCount(mediaRes.data[1]?.count),
		},
	};
};

export default getMultiple;
