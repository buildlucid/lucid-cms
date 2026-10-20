import { mediaFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { Media } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	canAccessMedia,
	getMediaOwnership,
	type MediaActor,
} from "../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { checkContentLocale } from "../locales/checks/index.js";

/**
 * Reads one media item the actor can reach, with its text in `locale` when given, falling back to `fallbackLocale`
 * for empty text. Callers type the localized shape, as the toolkit does by locale.
 */
const getSingle = async <TMedia = Media>(
	context: ServiceContext,
	data: {
		id: number;
		actor: MediaActor;
		locale?: string;
		fallbackLocale?: string;
	},
): ServiceResponse<TMedia> => {
	const localeRes = await checkContentLocale(context, data);
	if (localeRes.error) return localeRes;

	const Media = new MediaRepository(context.db);

	const mediaRes = await Media.selectSingleById({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	if (
		!canAccessMedia({
			actor: data.actor,
			ownership: getMediaOwnership(mediaRes.data),
			action: "read",
		})
	) {
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
		data: mediaFormatter.formatSingle({
			media: mediaRes.data,
			options: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
			read: data.locale
				? { locale: data.locale, fallbackLocale: data.fallbackLocale ?? null }
				: null,
		}) as TMedia,
	};
};

export default getSingle;
