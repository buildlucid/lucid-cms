import type { ServiceFn } from "../../../../../utils/services/types.js";
import type { MediaPropsT } from "../../../../formatters/media.js";
import { MediaRepository } from "../../../../repositories/index.js";

const fetchMediaRefs: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	MediaPropsT[]
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);

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

export default fetchMediaRefs;
