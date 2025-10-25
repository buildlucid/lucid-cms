import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import constants from "../../constants/constants.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import { isPast } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Authorize share access by validating the share password and checking that it isn't expired or soft-deleted
 */
const authorizeShare: ServiceFn<
	[
		{
			token: string;
			sessionCookie?: string;
			providedPassword?: string;
		},
	],
	{
		mediaKey: string;
		passwordRequired: boolean;
	}
> = async (context, data) => {
	const MediaShareLinks = Repository.get(
		"media-share-links",
		context.db,
		context.config.db,
	);

	const linkRes = await MediaShareLinks.selectSingleWithMediaByToken({
		token: data.token,
	});
	if (linkRes.error) return linkRes;

	//* check if expired
	if (linkRes.data.expires_at && isPast(linkRes.data.expires_at)) {
		return {
			error: {
				type: "basic",
				status: 410,
				message: T("invalid_or_expired_token"),
			},
			data: undefined,
		};
	}

	//* check if media is soft-deleted
	const isDeleted = Formatter.formatBoolean(linkRes.data.media_is_deleted);
	if (isDeleted) {
		return {
			error: {
				type: "basic",
				status: 410,
				message: T("media_not_found_message"),
			},
			data: undefined,
		};
	}

	//* check if password is required
	if (linkRes.data.password && !data.sessionCookie) {
		if (!data.providedPassword) {
			return {
				error: undefined,
				data: { passwordRequired: true, mediaKey: linkRes.data.media_key },
			};
		}

		const hashed = Buffer.from(
			scrypt(
				data.providedPassword,
				context.config.keys.encryptionKey,
				constants.scrypt,
			),
		).toString("base64");

		if (hashed !== linkRes.data.password) {
			return {
				error: {
					type: "authorisation",
					status: 401,
					message: T("please_ensure_password_is_correct"),
				},
				data: undefined,
			};
		}
	}

	return {
		error: undefined,
		data: {
			mediaKey: linkRes.data.media_key,
			passwordRequired: false,
		},
	};
};

export default authorizeShare;
