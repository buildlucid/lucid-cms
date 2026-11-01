import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import verifySecret from "../../utils/helpers/verify-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { createShareSession, verifyShareSession } from "./helpers/session.js";

/**
 * Checks share availability and password or session proof. Returns a session cookie after a
 * correct password.
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
		/** Cookie value returned after password verification. */
		session?: string;
	}
> = async (context, data) => {
	const MediaShareLinks = new MediaShareLinksRepository(context.db);

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

	if (
		linkRes.data.expires_at &&
		new Date(linkRes.data.expires_at).getTime() < Date.now()
	) {
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

	const password = linkRes.data.password;
	if (
		password &&
		!verifyShareSession(context, {
			token: data.token,
			password: password,
			session: data.sessionCookie,
		})
	) {
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

		const valid = await verifySecret(
			data.providedPassword,
			context.config.secrets.encryption,
			password,
		);
		if (!valid) {
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

		return {
			error: undefined,
			data: {
				mediaKey: linkRes.data.media_key,
				posterKey: linkRes.data.media_poster_key ?? null,
				passwordRequired: false,
				session: createShareSession(context, {
					token: data.token,
					password: password,
				}),
			},
		};
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
