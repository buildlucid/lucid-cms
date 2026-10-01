import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import deleteMediaPermanently from "../../media/delete-single-permanently.js";

/**
 * Permanently deletes the personal media of users about to be permanently
 * deleted, stored files included. Anything worth keeping should be moved to
 * the media library first. Runs before the users are removed, as their media
 * still references them.
 */
const deleteOwnedMedia: ServiceFn<
	[{ userIds: number[]; actorUserId: number | null }],
	undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db);

	const mediaRes = await Media.selectMultiple({
		select: ["id"],
		where: [
			{ key: "owner_user_id", operator: "in", value: data.userIds },
			{ key: "parent_media_id", operator: "is", value: null },
		],
		validation: { enabled: true },
	});
	if (mediaRes.error) return mediaRes;

	for (const media of mediaRes.data) {
		const deleteRes = await deleteMediaPermanently(context, {
			id: media.id,
			actor: { type: "internal" },
			userId: data.actorUserId,
		});
		if (deleteRes.error) return deleteRes;
	}

	return { error: undefined, data: undefined };
};

export default deleteOwnedMedia;
