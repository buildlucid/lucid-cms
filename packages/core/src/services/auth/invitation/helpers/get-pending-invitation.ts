import constants from "../../../../constants/constants.js";
import formatter from "../../../../libs/formatters/index.js";
import { copy } from "../../../../libs/i18n/index.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../../../libs/repositories/index.js";
import hashUserToken from "../../../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/**
 * Finds an invitation that can still be accepted from its emailed token: active
 * and for a user who hasn't accepted yet and isn't deleted or locked.
 */
const getPendingInvitation: ServiceFn<
	[
		{
			token: string;
		},
	],
	{
		tokenId: number;
		userId: number;
	}
> = async (context, data) => {
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

	return {
		error: undefined,
		data: {
			tokenId: tokenRes.data.id,
			userId: tokenRes.data.user_id,
		},
	};
};

export default getPendingInvitation;
