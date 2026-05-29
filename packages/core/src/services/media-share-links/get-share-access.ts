import { isPast } from "date-fns";
import formatter, {
	mediaShareLinksFormatter,
} from "../../libs/formatters/index.js";
import { text } from "../../libs/i18n/index.js";
import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import type { ShareLinkAccess } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { createShareStreamUrl } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getShareAccess: ServiceFn<
	[
		{
			token: string;
			sessionCookie?: string;
		},
	],
	ShareLinkAccess
> = async (context, data) => {
	const MediaShareLinks = new MediaShareLinksRepository(
		context.db.client,
		context.config.db,
	);

	const linkRes = await MediaShareLinks.selectSingleWithMediaByToken({
		token: data.token,
	});
	if (linkRes.error) {
		return {
			error: {
				type: "basic",
				name: text.server("core.share.links.not.found.title"),
				status: 404,
				message: text.server("core.share.links.not.found.message"),
			},
			data: undefined,
		};
	}

	if (linkRes.data.expires_at && isPast(linkRes.data.expires_at)) {
		return {
			error: {
				type: "basic",
				name: text.server("core.share.links.expired.title"),
				status: 410,
				message: text.server("core.share.links.expired.message"),
			},
			data: undefined,
		};
	}

	const isDeleted = formatter.formatBoolean(linkRes.data.media_is_deleted);
	if (isDeleted) {
		return {
			error: {
				type: "basic",
				name: text.server("core.share.links.media.deleted.title"),
				status: 410,
				message: text.server("core.share.links.media.deleted.message"),
			},
			data: undefined,
		};
	}

	const hasPassword = Boolean(linkRes.data.password);
	const passwordRequired = hasPassword && !data.sessionCookie;

	const host = getBaseUrl(context);
	const shareUrl = createShareStreamUrl({
		token: linkRes.data.token,
		host,
	});
	const posterShareUrl =
		linkRes.data.media_poster_key && linkRes.data.media_poster_type === "image"
			? createShareStreamUrl({
					token: linkRes.data.token,
					host,
					poster: true,
				})
			: undefined;

	return {
		error: undefined,
		data: mediaShareLinksFormatter.formatShareAccess({
			link: linkRes.data,
			shareUrl,
			posterShareUrl,
			passwordRequired,
		}),
	};
};

export default getShareAccess;
