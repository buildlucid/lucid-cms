import { mediaFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { Media } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	Media
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);

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

	return {
		error: undefined,
		data: mediaFormatter.formatSingle({
			media: mediaRes.data,
			host: getBaseUrl(context),
		}),
	};
};

export default getSingle;
