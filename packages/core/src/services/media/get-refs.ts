import type { MediaRefData } from "../../libs/refs/media/types.js";
import type { RefResourceTargets } from "../../libs/refs/types.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMediaRefs: ServiceFn<
	[{ targets: RefResourceTargets }],
	MediaRefData
> = async (context, data) => {
	const ids = Array.from(
		new Set(
			Array.from(data.targets.values()).flatMap((values) =>
				Array.from(values).filter(
					(value): value is number => typeof value === "number",
				),
			),
		),
	);
	if (ids.length === 0) return { data: [], error: undefined };

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultipleByIds({
		ids,
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

export default getMediaRefs;
