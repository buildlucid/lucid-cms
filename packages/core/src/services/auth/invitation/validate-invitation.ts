import constants from "../../../constants/constants.js";
import { logger } from "../../../index.js";
import formatter from "../../../libs/formatters/index.js";
import {
	UserTokensRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { ValidateInvitationResponse } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Validates a invitation token and returns the user information if valid.
 */
const validateInvitation: ServiceFn<
	[
		{
			token: string;
		},
	],
	ValidateInvitationResponse
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db, context.config.db);
	const Users = new UsersRepository(context.db, context.config.db);

	const userTokenRes = await UserTokens.selectSingle({
		select: ["id", "user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: data.token,
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
		],
		validation: {
			enabled: true,
		},
	});
	if (userTokenRes.error) {
		return {
			error: undefined,
			data: {
				valid: false,
			},
		};
	}

	const userRes = await Users.selectSingle({
		select: [
			"id",
			"email",
			"username",
			"first_name",
			"last_name",
			"invitation_accepted",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: userTokenRes.data.user_id,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) {
		logger.error({
			message: T("user_not_found_message"),
		});
		return {
			error: undefined,
			data: {
				valid: false,
			},
		};
	}

	if (formatter.formatBoolean(userRes.data?.invitation_accepted)) {
		logger.error({
			message: T("user_invitation_already_accepted_message"),
		});
		return {
			error: undefined,
			data: {
				valid: false,
			},
		};
	}

	return {
		error: undefined,
		data: {
			valid: true,
			user: {
				id: userRes.data.id,
				email: userRes.data.email,
				username: userRes.data.username,
				firstName: userRes.data.first_name,
				lastName: userRes.data.last_name,
			},
		},
	};
};

export default validateInvitation;
