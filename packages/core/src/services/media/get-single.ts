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
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			actor: MediaActor;
		},
	],
	Media
> = async (context, data) => {
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
		}),
	};
};

export default getSingle;
