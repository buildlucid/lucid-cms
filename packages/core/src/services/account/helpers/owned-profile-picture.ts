import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Returns the profile picture's media ID while it's still personal to the user.
 * A picture that has since moved to the media library belongs to everyone, so
 * it's left alone when the user replaces or removes their picture.
 */
const ownedProfilePicture: ServiceFn<
	[{ mediaId: number | null; userId: number }],
	number | null
> = async (context, data) => {
	if (data.mediaId === null) return { error: undefined, data: null };

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectSingle({
		select: ["id"],
		where: [
			{ key: "id", operator: "=", value: data.mediaId },
			{ key: "owner_user_id", operator: "=", value: data.userId },
		],
	});
	if (mediaRes.error) return mediaRes;

	return { error: undefined, data: mediaRes.data?.id ?? null };
};

export default ownedProfilePicture;
