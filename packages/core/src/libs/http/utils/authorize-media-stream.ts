import type { LucidAuth, LucidHonoContext } from "../../../types/hono.js";
import { LucidError } from "../../../utils/errors/index.js";
import {
	canAccessMedia,
	canBrowseMedia,
	getMediaOwnership,
} from "../../../utils/media/index.js";
import formatter from "../../formatters/index.js";
import { MediaRepository } from "../../repositories/index.js";
import { authenticationCheck } from "../middleware/authenticate.js";

/**
 * Resolves a media UID for CDN access. Public media is open; private media requires admin
 * authentication, with ownership or `media:read-all` for personal and system media. Binned media
 * requires library access. Returns null when inaccessible.
 */
const authorizeMediaStream = async (
	c: LucidHonoContext,
	uid: string,
): Promise<{ key: string; public: boolean; inBin: boolean } | null> => {
	const Media = new MediaRepository(c.get("db"));
	const mediaRes = await Media.selectSingleStreamAccessByUid({ uid });
	if (mediaRes.error) throw new LucidError(mediaRes.error);

	const media = mediaRes.data;
	if (!media) return null;

	const isPublic = formatter.formatBoolean(media.public);
	const inBin =
		media.parent_media_id === null
			? formatter.formatBoolean(media.is_deleted)
			: formatter.formatBoolean(media.parent_is_deleted ?? false);
	const access = { key: media.key, public: isPublic, inBin };
	if (isPublic && !inBin) return access;

	await authenticationCheck(c, { soft: inBin });
	const auth: LucidAuth | undefined = c.get("auth");
	if (!auth) return null;

	const actor = { type: "user", user: auth } as const;
	const ownership = getMediaOwnership(media);
	const allowed =
		canAccessMedia({ actor, ownership, action: "read" }) &&
		(!inBin || canBrowseMedia({ actor, ownership }));
	if (!allowed) return null;

	return access;
};

export default authorizeMediaStream;
