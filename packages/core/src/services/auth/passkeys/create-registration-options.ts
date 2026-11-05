import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	PasskeyChallengesRepository,
	UserPasskeysRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRelyingParty from "./helpers/relying-party.js";

/**
 * Creates a user-bound challenge, excluding existing credentials to prevent duplicate
 * registration.
 */
const createRegistrationOptions: ServiceFn<
	[
		{
			userId: number;
		},
	],
	PublicKeyCredentialCreationOptionsJSON
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

	// Defer WebAuthn loading until needed.
	const [{ generateRegistrationOptions }, { isoBase64URL }] = await Promise.all(
		[
			import("@simplewebauthn/server"),
			import("@simplewebauthn/server/helpers"),
		],
	);

	const Users = new UsersRepository(context.db);
	const Passkeys = new UserPasskeysRepository(context.db);
	const PasskeyChallenges = new PasskeyChallengesRepository(context.db);

	const [userRes, passkeysRes] = await Promise.all([
		Users.selectSingle({
			select: ["email", "username", "first_name", "last_name"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
			validation: {
				enabled: true,
			},
		}),
		Passkeys.selectMultiple({
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
		}),
	]);
	if (userRes.error) return userRes;
	if (passkeysRes.error) return passkeysRes;

	if (passkeysRes.data.length >= constants.passkeys.maxPerUser) {
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

	//* every passkey on the account shares one random handle, made the first time one is added
	const userHandleRes = await Users.setPasskeyUserId({
		id: data.userId,
		passkeyUserId: isoBase64URL.fromBuffer(
			crypto.getRandomValues(
				new Uint8Array(constants.passkeys.userHandleBytes),
			),
		),
	});
	if (userHandleRes.error) return userHandleRes;
	if (!userHandleRes.data) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.user.not.found.message"),
			},
			data: undefined,
		};
	}

	const relyingParty = getRelyingParty(context);
	const fullName = [userRes.data.first_name, userRes.data.last_name]
		.filter(Boolean)
		.join(" ");
	const expiresInMs = constants.passkeys.challengeExpirationMinutes * 60_000;

	const options = await generateRegistrationOptions({
		rpName: relyingParty.name,
		rpID: relyingParty.id,
		userID: isoBase64URL.toBuffer(userHandleRes.data),
		userName: userRes.data.email,
		userDisplayName: fullName || userRes.data.username,
		challenge: crypto.getRandomValues(
			new Uint8Array(constants.passkeys.challengeBytes),
		),
		timeout: expiresInMs,
		attestationType: "none",
		excludeCredentials: passkeysRes.data.map((passkey) => ({
			id: passkey.credential_id,
			transports: passkey.transports ?? undefined,
		})),
		//* passkeys have to be offered without a username, and check who's holding the device
		authenticatorSelection: {
			residentKey: "required",
			userVerification: "required",
		},
		supportedAlgorithmIDs: constants.passkeys.algorithms,
	});

	const createRes = await PasskeyChallenges.createSingle({
		data: {
			challenge: options.challenge,
			purpose: constants.passkeys.purposes.registration,
			user_id: data.userId,
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

export default createRegistrationOptions;
