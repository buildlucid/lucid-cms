import type { MediaPropsT } from "../../libs/formatters/media.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	MediaPropsT[]
> = async (context, data) => {
	const Media = Repository.get("media", context.db, context.config.db);

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
		data: mediaRes.data,
	};
};

export default getMultipleFieldMeta;
