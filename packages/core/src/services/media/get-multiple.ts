import formatter, { mediaFormatter } from "../../libs/formatters/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type { MediaListItem } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	getMediaListAccess,
	type MediaActor,
} from "../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { checkContentLocale } from "../locales/checks/index.js";

/**
 * Lists media allowed by the ownership filter and actor access, leaving out audio transcripts unless the query includes
 * them, with text in `locale` when given, falling back to `fallbackLocale`. Callers type the localized shape.
 */
const getMultiple = async <TMedia = MediaListItem>(
	context: ServiceContext,
	data: {
		query: GetMultipleQueryParams;
		actor: MediaActor;
		locale?: string;
		fallbackLocale?: string;
	},
): ServiceResponse<{
	data: TMedia[];
	count: number;
}> => {
	const localeRes = await checkContentLocale(context, data);
	if (localeRes.error) return localeRes;

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
				include: {
					transcripts: data.query.include?.includes("transcripts") === true,
				},
				read: data.locale
					? { locale: data.locale, fallbackLocale: data.fallbackLocale ?? null }
					: null,
			}) as TMedia[],
			count: formatter.parseCount(mediaRes.data[1]?.count),
		},
	};
};

export default getMultiple;
