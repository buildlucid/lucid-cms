import { MediaRepository } from "../../../libs/repositories/index.js";
import type { MediaOwnership } from "../../../types/response.js";
import { getMediaOwnership } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const mediaOwnership: ServiceFn<
	[{ mediaIds: number[] }],
	Map<number, MediaOwnership>
> = async (context, input) => {
	if (input.mediaIds.length === 0) return { error: undefined, data: new Map() };

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultiple({
		select: ["id", "owner_user_id", "is_system"],
		where: [{ key: "id", operator: "in", value: input.mediaIds }],
		validation: { enabled: true },
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: new Map(
			mediaRes.data.map((media) => [media.id, getMediaOwnership(media)]),
		),
	};
};

export default mediaOwnership;
