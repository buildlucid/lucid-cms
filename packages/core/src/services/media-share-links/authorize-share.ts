import { scrypt } from "@noble/hashes/scrypt.js";
import { isPast } from "date-fns";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
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
			enforcePasswordSession?: boolean;
		},
	],
	{
		mediaKey: string;
		posterKey: string | null;
		passwordRequired: boolean;
	}
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
				name: copy("server:core.share.links.not.found.title"),
				status: 404,
				message: copy("server:core.share.links.not.found.message"),
			},
			data: undefined,
		};
	}

	//* check if expired
	if (linkRes.data.expires_at && isPast(linkRes.data.expires_at)) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.share.links.expired.title"),
				status: 410,
				message: copy("server:core.share.links.expired.message"),
			},
			data: undefined,
		};
	}

	//* check if media is soft-deleted
	const isDeleted = formatter.formatBoolean(linkRes.data.media_is_deleted);
	if (isDeleted) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.share.links.media.deleted.title"),
				status: 410,
				message: copy("server:core.share.links.media.deleted.message"),
			},
			data: undefined,
		};
	}

	//* check if password is required
	if (linkRes.data.password && !data.sessionCookie) {
		if (!data.providedPassword) {
			if (data.enforcePasswordSession) {
				return {
					error: {
						type: "authorisation",
						name: copy("server:core.share.stream.password.required.title"),
						status: 401,
						message: copy("server:core.share.stream.password.required.message"),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					passwordRequired: true,
					mediaKey: linkRes.data.media_key,
					posterKey: linkRes.data.media_poster_key ?? null,
				},
			};
		}

		const hashed = Buffer.from(
			scrypt(
				data.providedPassword,
				context.config.secrets.encryption,
				constants.scrypt,
			),
		).toString("base64");

		if (hashed !== linkRes.data.password) {
			return {
				error: {
					type: "authorisation",
					name: copy("server:core.share.links.access.denied.title"),
					status: 401,
					message: copy("server:core.share.links.incorrect.password.message"),
				},
				data: undefined,
			};
		}
	}

	return {
		error: undefined,
		data: {
			mediaKey: linkRes.data.media_key,
			posterKey: linkRes.data.media_poster_key ?? null,
			passwordRequired: false,
		},
	};
};

export default authorizeShare;
