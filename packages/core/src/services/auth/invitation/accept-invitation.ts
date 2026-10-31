import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Accepts an invitation and marks it as accepted. With password login enabled this
 * sets the user's password. Without it, magic link login must be on, and the user
 * logs in with emailed codes from then on.
 */
const acceptInvitation: ServiceFn<
	[
		{
			token: string;
			password?: string;
		},
	],
	{
		id: number;
	}
> = async (context, data) => {
	const passwordEnabled = context.config.auth.password.enabled;

	if (!passwordEnabled && !context.config.auth.magicLink.enabled) {
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

	if (passwordEnabled && data.password === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.invitations.password.required.message"),
			},
			data: undefined,
		};
	}

	const UserTokens = new UserTokensRepository(context.db);
	const Users = new UsersRepository(context.db);
	const hashedToken = hashUserToken(data.token);

	const tokenRes = await UserTokens.selectSingle({
		select: ["id", "user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: hashedToken,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.invitation,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: new Date().toISOString(),
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
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.tokens.not.found.message"),
				status: 404,
			},
		},
	});
	if (tokenRes.error) return tokenRes;

	const userRes = await Users.selectSingle({
		select: ["id", "invitation_accepted", "is_deleted", "is_locked"],
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.user.not.found.message"),
			},
		},
	});
	if (userRes.error) return userRes;

	if (formatter.formatBoolean(userRes.data?.invitation_accepted)) {
		return {
			error: {
				type: "basic",
				status: 400,
				name: copy("server:core.auth.invitations.user.already.accepted.name"),
				message: copy(
					"server:core.auth.invitations.user.already.accepted.message",
				),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(userRes.data.is_deleted)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.suspended.error.message"),
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(userRes.data.is_locked)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.locked.error.message"),
			},
			data: undefined,
		};
	}

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
				value: tokenRes.data.id,
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

	let passwordData: { password: string; secret: string } | undefined;
	if (passwordEnabled && data.password !== undefined) {
		const { secret, encryptSecret } = generateSecret(
			context.config.secrets.encryption,
		);
		passwordData = {
			password: await hashSecret(data.password, secret),
			secret: encryptSecret,
		};
	}

	const updatedUserRes = await Users.updateSingle({
		data: {
			...passwordData,
			invitation_accepted: true,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
			},
		},
	});
	if (updatedUserRes.error) return updatedUserRes;

	return {
		error: undefined,
		data: {
			id: tokenRes.data.user_id,
		},
	};
};

export default acceptInvitation;
