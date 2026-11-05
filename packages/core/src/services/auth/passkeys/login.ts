import type {
	AuthenticationResponseJSON,
	VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	PasskeyChallengesRepository,
	UserPasskeysRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRelyingParty from "./helpers/relying-party.js";

/**
 * Consumes the challenge before verification. Run without a transaction so failed checks cannot
 * reuse it.
 */
const login: ServiceFn<
	[
		{
			response: AuthenticationResponseJSON;
			/** The user whose two-factor step this answers. */
			userId?: number;
		},
	],
	{
		id: number;
	}
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
	const [
		{ verifyAuthenticationResponse },
		{ decodeClientDataJSON, isoBase64URL },
	] = await Promise.all([
		import("@simplewebauthn/server"),
		import("@simplewebauthn/server/helpers"),
	]);

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
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.passkeys.login.error.message"),
			},
			data: undefined,
		};
	}

	const consumeRes = await PasskeyChallenges.consume({
		challenge: challenge,
		purpose:
			data.userId === undefined
				? constants.passkeys.purposes.login
				: constants.passkeys.purposes.twoFactor,
		userId: data.userId,
	});
	if (consumeRes.error) return consumeRes;
	if (!consumeRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "passkey_expired",
				status: 401,
				message: copy("server:core.auth.passkeys.expired.message"),
			},
			data: undefined,
		};
	}

	const passkeyRes = await Passkeys.selectSingleForLogin({
		credentialId: data.response.id,
	});
	if (passkeyRes.error) return passkeyRes;

	const passkey = passkeyRes.data;
	//* the code tells the browser to stop offering a passkey this site no longer has
	if (!passkey) {
		return {
			error: {
				type: "authorisation",
				code: "passkey_unknown",
				status: 401,
				message: copy("server:core.auth.passkeys.unknown.message"),
			},
			data: undefined,
		};
	}

	//* a sign-in names no account, so the passkey's user handle has to say whose it is. A two-factor step names the user, and browsers may leave the handle out
	const userHandle = data.response.response.userHandle;
	const ownerMatches =
		data.userId === undefined
			? userHandle !== undefined && userHandle === passkey.user_passkey_user_id
			: passkey.user_id === data.userId &&
				(userHandle === undefined ||
					userHandle === passkey.user_passkey_user_id);

	if (
		!ownerMatches ||
		!formatter.formatBoolean(passkey.user_invitation_accepted)
	) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.passkeys.login.error.message"),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(passkey.user_is_deleted)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.suspended.error.message"),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(passkey.user_is_locked)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.locked.error.message"),
			},
			data: undefined,
		};
	}

	const relyingParty = getRelyingParty(context);
	let verification: VerifiedAuthenticationResponse | undefined;
	try {
		verification = await verifyAuthenticationResponse({
			response: data.response,
			expectedChallenge: challenge,
			expectedOrigin: relyingParty.origin,
			expectedRPID: relyingParty.id,
			credential: {
				id: passkey.credential_id,
				publicKey: isoBase64URL.toBuffer(passkey.public_key),
				counter: passkey.counter,
				transports: passkey.transports ?? undefined,
			},
			requireUserVerification: true,
		});
	} catch {
		verification = undefined;
	}

	if (!verification?.verified) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.passkeys.login.error.message"),
			},
			data: undefined,
		};
	}

	const recordRes = await Passkeys.recordLogin({
		id: passkey.id,
		counter: verification.authenticationInfo.newCounter,
		backedUp: verification.authenticationInfo.credentialBackedUp,
	});
	if (recordRes.error) return recordRes;
	//* the passkey was removed while the sign-in was being checked
	if (!recordRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "passkey_unknown",
				status: 401,
				message: copy("server:core.auth.passkeys.unknown.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: passkey.user_id,
		},
	};
};

export default login;
