import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	PasskeyChallengesRepository,
	UserPasskeysRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRelyingParty from "./helpers/relying-party.js";

/** Creates a single-use challenge. Supplying a user restricts the offered passkeys to that account. */
const createLoginOptions: ServiceFn<
	[
		{
			/** The user whose two-factor step this is for. */
			userId?: number;
		},
	],
	PublicKeyCredentialRequestOptionsJSON
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

	const passkeysRes =
		data.userId === undefined
			? undefined
			: await Passkeys.selectMultiple({
					select: ["credential_id", "transports"],
					where: [
						{
							key: "user_id",
							operator: "=",
							value: data.userId,
						},
					],
					validation: {
						enabled: true,
					},
				});
	if (passkeysRes?.error) return passkeysRes;
	if (passkeysRes?.data.length === 0) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.none.message"),
			},
			data: undefined,
		};
	}

	// Defer WebAuthn loading until needed.
	const { generateAuthenticationOptions } =
		await import("@simplewebauthn/server");
	const expiresInMs = constants.passkeys.challengeExpirationMinutes * 60_000;
	const options = await generateAuthenticationOptions({
		rpID: getRelyingParty(context).id,
		challenge: crypto.getRandomValues(
			new Uint8Array(constants.passkeys.challengeBytes),
		),
		timeout: expiresInMs,
		allowCredentials: passkeysRes?.data.map((passkey) => ({
			id: passkey.credential_id,
			transports: passkey.transports ?? undefined,
		})),
		//* a passkey counts as two factors, so it has to check who's holding the device
		userVerification: "required",
	});

	const createRes = await PasskeyChallenges.createSingle({
		data: {
			challenge: options.challenge,
			purpose:
				data.userId === undefined
					? constants.passkeys.purposes.login
					: constants.passkeys.purposes.twoFactor,
			user_id: data.userId ?? null,
			expiry_date: new Date(Date.now() + expiresInMs).toISOString(),
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: options,
	};
};

export default createLoginOptions;
