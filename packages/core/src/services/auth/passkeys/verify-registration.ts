import {
	type RegistrationResponseJSON,
	type VerifiedRegistrationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	PasskeyChallengesRepository,
	UserPasskeysRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRelyingParty from "./helpers/relying-party.js";

/** A checked new passkey, ready for `savePasskey`. */
export type VerifiedPasskey = NonNullable<
	Extract<VerifiedRegistrationResponse, { verified: true }>["registrationInfo"]
>;

/**
 * Verifies without saving. Run outside a transaction so failed checks leave the challenge
 * consumed.
 */
const verifyRegistration: ServiceFn<
	[
		{
			userId: number;
			response: RegistrationResponseJSON;
		},
	],
	VerifiedPasskey
> = async (context, data) => {
	if (!context.config.auth.passkeys.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.disabled.message"),
			},
			data: undefined,
		};
	}

	const PasskeyChallenges = new PasskeyChallengesRepository(context.db);
	const Passkeys = new UserPasskeysRepository(context.db);

	let challenge: string;
	try {
		challenge = decodeClientDataJSON(
			data.response.response.clientDataJSON,
		).challenge;
	} catch {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.register.error.message"),
			},
			data: undefined,
		};
	}

	const [consumeRes, countRes] = await Promise.all([
		PasskeyChallenges.consume({
			challenge: challenge,
			purpose: constants.passkeys.purposes.registration,
			userId: data.userId,
		}),
		Passkeys.count({
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.userId,
				},
			],
		}),
	]);
	if (consumeRes.error) return consumeRes;
	if (countRes.error) return countRes;

	if (!consumeRes.data) {
		return {
			error: {
				type: "basic",
				code: "passkey_expired",
				status: 400,
				message: copy("server:core.auth.passkeys.expired.message"),
			},
			data: undefined,
		};
	}

	if (
		formatter.parseCount(countRes.data?.count) >= constants.passkeys.maxPerUser
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.limit.message", {
					data: { max: constants.passkeys.maxPerUser },
				}),
			},
			data: undefined,
		};
	}

	const relyingParty = getRelyingParty(context);
	let verification: VerifiedRegistrationResponse | undefined;
	try {
		verification = await verifyRegistrationResponse({
			response: data.response,
			expectedChallenge: challenge,
			expectedOrigin: relyingParty.origin,
			expectedRPID: relyingParty.id,
			requireUserVerification: true,
			supportedAlgorithmIDs: constants.passkeys.algorithms,
		});
	} catch {
		verification = undefined;
	}
	if (!verification?.verified) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.register.error.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: verification.registrationInfo,
	};
};

export default verifyRegistration;
