import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CFResponse } from "../../types.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	CFResponse<"media">["meta"][]
> = async (context, data) => {
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaFormatter = Formatter.get("media");

	if (data.ids.length === 0) {
		return {
			data: [],
			error: undefined,
		};
	}

	const mediaRes = await Media.selectMultipleByIds({
		ids: data.ids,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: MediaFormatter.formatMultiple({
			media: mediaRes.data,
			host: context.config.host,
		}),
	};
};

export default getMultipleFieldMeta;
