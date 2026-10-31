import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import savePasskey from "../passkeys/save-passkey.js";
import verifyRegistration from "../passkeys/verify-registration.js";
import getPendingInvitation from "./helpers/get-pending-invitation.js";

/**
 * Accepts with a password or passkey, or uses magic link login when passwords are disabled. Run
 * without a transaction so failed passkey checks leave their challenge consumed.
 */
const acceptInvitation: ServiceFn<
	[
		{
			token: string;
			password?: string;
			/** A new passkey from the browser, made with the invitation's passkey options. */
			passkey?: RegistrationResponseJSON;
		},
	],
	{
		id: number;
	}
> = async (context, data) => {
	const passwordEnabled = context.config.auth.password.enabled;

	if (
		!passwordEnabled &&
		!context.config.auth.magicLink.enabled &&
		data.passkey === undefined
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy(
					"server:core.auth.password.authentication.disabled.message",
				),
			},
			data: undefined,
		};
	}

	if (
		passwordEnabled &&
		data.password === undefined &&
		data.passkey === undefined
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.invitations.password.required.message"),
			},
			data: undefined,
		};
	}

	const invitationRes = await getPendingInvitation(context, {
		token: data.token,
	});
	if (invitationRes.error) return invitationRes;
	const { tokenId, userId } = invitationRes.data;

	const passkeyRes =
		data.passkey === undefined
			? undefined
			: await verifyRegistration(context, {
					userId: userId,
					response: data.passkey,
				});
	if (passkeyRes?.error) return passkeyRes;

	let passwordData: { password: string; secret: string } | undefined;
	if (passwordEnabled && data.password !== undefined && !passkeyRes) {
		const { secret, encryptSecret } = generateSecret(
			context.config.secrets.encryption,
		);
		passwordData = {
			password: await hashSecret(data.password, secret),
			secret: encryptSecret,
		};
	}

	return withTransaction(context, async (context) => {
		const UserTokens = new UserTokensRepository(context.db);
		const Users = new UsersRepository(context.db);
		const now = new Date().toISOString();

		const consumeTokenRes = await UserTokens.updateSingle({
			data: {
				consumed_at: now,
				revoked_at: now,
				revoke_reason: constants.userTokenRevokeReasons.invitationAccepted,
				expiry_date: now,
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: tokenId,
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.invitation,
				},
				{
					key: "expiry_date",
					operator: ">",
					value: now,
				},
				{
					key: "revoked_at",
					operator: "is",
					value: null,
				},
				{
					key: "consumed_at",
					operator: "is",
					value: null,
				},
			],
			returning: ["id"],
		});
		if (consumeTokenRes.error) return consumeTokenRes;
		if (!consumeTokenRes.data) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.tokens.not.found.message"),
					status: 404,
				},
				data: undefined,
			};
		}

		const updatedUserRes = await Users.updateSingle({
			data: {
				...passwordData,
				invitation_accepted: true,
				updated_at: now,
			},
			//* the user is checked again here, as they may have been locked or deleted since the first look
			where: [
				{
					key: "id",
					operator: "=",
					value: userId,
				},
				{
					key: "invitation_accepted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
				{
					key: "is_locked",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: copy("server:core.tokens.not.found.message"),
				},
			},
		});
		if (updatedUserRes.error) return updatedUserRes;

		if (passkeyRes) {
			const saveRes = await savePasskey(context, {
				userId: userId,
				passkey: passkeyRes.data,
			});
			if (saveRes.error) return saveRes;
		}

		return {
			error: undefined,
			data: {
				id: userId,
			},
		};
	});
};

export default acceptInvitation;
