import { isPast } from "date-fns";
import formatter, {
	mediaShareLinksFormatter,
} from "../../libs/formatters/index.js";
import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ShareLinkAccessResponse } from "../../types/response.js";
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
	ShareLinkAccessResponse
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
				name: T("share_link_not_found_title"),
				status: 404,
				message: T("share_link_not_found_message"),
			},
			data: undefined,
		};
	}

	if (linkRes.data.expires_at && isPast(linkRes.data.expires_at)) {
		return {
			error: {
				type: "basic",
				name: T("share_link_expired_title"),
				status: 410,
				message: T("share_link_expired_message"),
			},
			data: undefined,
		};
	}

	const isDeleted = formatter.formatBoolean(linkRes.data.media_is_deleted);
	if (isDeleted) {
		return {
			error: {
				type: "basic",
				name: T("share_link_media_deleted_title"),
				status: 410,
				message: T("share_link_media_deleted_message"),
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

	return {
		error: undefined,
		data: mediaShareLinksFormatter.formatShareAccess({
			link: linkRes.data,
			shareUrl,
			passwordRequired,
		}),
	};
};

export default getShareAccess;
