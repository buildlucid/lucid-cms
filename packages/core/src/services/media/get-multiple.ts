import formatter, { mediaFormatter } from "../../libs/formatters/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type { Media } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	getMediaListAccess,
	type MediaActor,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists library media, or personal and system media when the ownership filter asks for it and the actor can see it. */
const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
			actor: MediaActor;
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
		access: getMediaListAccess(data.actor),
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
					defaultLocale: context.config.localization.defaultLocale,
					locales: context.config.localization.locales,
				},
			}),
			count: formatter.parseCount(mediaRes.data[1]?.count),
		},
	};
};

export default getMultiple;
