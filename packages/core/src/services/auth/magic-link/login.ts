import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { magicLinkCodeMatches } from "./helpers/code.js";

/**
 * Logs a user in with the newest magic link they were sent, using either the
 * link's token or their email and the code. Either one uses up the magic link.
 */
const login: ServiceFn<
	[{ token: string } | { email: string; code: string }],
	{
		id: number;
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
	const invalidMessage =
		"code" in data
			? copy("server:core.auth.magic.link.invalid.code.message")
			: copy("server:core.auth.magic.link.invalid.link.message");

	const magicLinkRes = await UserTokens.selectActiveMagicLink({
		where:
			"code" in data
				? { email: normalizeEmailInput(data.email) }
				: { token: hashUserToken(data.token) },
	});
	if (magicLinkRes.error) return magicLinkRes;

	const magicLink = magicLinkRes.data;

	//* each code entry is counted before comparing, so parallel guesses can't go over the limit
	let credentialsMatch = magicLink !== undefined;
	if (magicLink && "code" in data) {
		const attemptRes = await UserTokens.incrementCodeAttempts({
			id: magicLink.id,
			maxAttempts: constants.magicLink.maxCodeAttempts,
		});
		if (attemptRes.error) return attemptRes;

		credentialsMatch =
			attemptRes.data &&
			magicLinkCodeMatches(context, data.code, magicLink.code);
	}

	if (
		!magicLink ||
		!credentialsMatch ||
		!formatter.formatBoolean(magicLink.user_invitation_accepted)
	) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: invalidMessage,
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(magicLink.user_is_deleted)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.suspended.error.message"),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(magicLink.user_is_locked)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.locked.error.message"),
			},
			data: undefined,
		};
	}

	//* the email binding is checked again here, as the address may have changed since the lookup
	const consumeRes = await UserTokens.consumeMagicLink({ id: magicLink.id });
	if (consumeRes.error) return consumeRes;
	if (!consumeRes.data) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: invalidMessage,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: magicLink.user_id,
		},
	};
};

export default login;
