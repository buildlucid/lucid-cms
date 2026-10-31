import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import savePasskey from "../passkeys/save-passkey.js";
import verifyRegistration from "../passkeys/verify-registration.js";

/**
 * Verifies outside a transaction, then saves the passkey and consumes the two-factor challenge
 * atomically.
 */
const confirmPasskey: ServiceFn<
	[
		{
			challengeId: number;
			userId: number;
			response: RegistrationResponseJSON;
		},
	],
	undefined
> = async (context, data) => {
	const verifyRes = await verifyRegistration(context, {
		userId: data.userId,
		response: data.response,
	});
	if (verifyRes.error) return verifyRes;

	return withTransaction(context, async (context) => {
		const UserTokens = new UserTokensRepository(context.db);

		const consumeRes = await UserTokens.consumeTwoFactorChallenge({
			id: data.challengeId,
		});
		if (consumeRes.error) return consumeRes;
		if (!consumeRes.data) {
			return {
				error: {
					type: "authorisation",
					code: "two_factor_expired",
					status: 401,
					message: copy(
						"server:core.auth.two.factor.challenge.expired.message",
					),
				},
				data: undefined,
			};
		}

		const saveRes = await savePasskey(context, {
			userId: data.userId,
			passkey: verifyRes.data,
		});
		if (saveRes.error) return saveRes;

		return {
			error: undefined,
			data: undefined,
		};
	});
};

export default confirmPasskey;
