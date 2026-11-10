import formatter, { mediaFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { Media } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	canAccessMedia,
	canBrowseMedia,
	getMediaOwnership,
	type MediaActor,
} from "../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { checkContentLocale } from "../locales/checks/index.js";

/**
 * Reads accessible media with optional locale and fallback. Content actors exclude deleted media.
 * Callers supply the localized result type.
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

	const ownership = getMediaOwnership(mediaRes.data);
	if (
		(data.actor.type === "content" &&
			formatter.formatBoolean(mediaRes.data.is_deleted)) ||
		!canAccessMedia({ actor: data.actor, ownership, action: "read" }) ||
		!canBrowseMedia({ actor: data.actor, ownership })
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
