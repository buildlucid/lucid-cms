import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Checks a magic link's token without using it, so the admin can show who it
 * logs in as before the user confirms. Link scanners can open this safely.
 */
const validate: ServiceFn<
	[
		{
			token: string;
		},
	],
	{
		email: string;
	}
> = async (context, data) => {
	if (context.config.auth.magicLink.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.magic.link.disabled.message"),
			},
			data: undefined,
		};
	}

	const UserTokens = new UserTokensRepository(context.db);

	const magicLinkRes = await UserTokens.selectActiveMagicLink({
		where: {
			token: hashUserToken(data.token),
		},
	});
	if (magicLinkRes.error) return magicLinkRes;

	if (
		magicLinkRes.data === undefined ||
		formatter.formatBoolean(magicLinkRes.data.user_is_deleted) ||
		formatter.formatBoolean(magicLinkRes.data.user_is_locked)
	) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.auth.magic.link.invalid.link.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			email: magicLinkRes.data.user_email,
		},
	};
};

export default validate;
