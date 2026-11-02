import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns the uids of library media, keyed by ID. Personal and system media can't be linked from content. */
const identifyMedia: ServiceFn<
	[{ ids: string[] }],
	Map<string, string>
> = async (context, data) => {
	const ids = data.ids.map(Number).filter(Number.isInteger);
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultiple({
		select: ["id", "uid"],
		where: [
			{ key: "id", operator: "in", value: ids },
			{ key: "is_deleted", operator: "=", value: false },
			{ key: "parent_media_id", operator: "is", value: null },
			{ key: "owner_user_id", operator: "is", value: null },
			{ key: "is_system", operator: "=", value: false },
		],
		validation: { enabled: true },
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: new Map(mediaRes.data.map((media) => [String(media.id), media.uid])),
	};
};

export default identifyMedia;
