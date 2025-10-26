import Repository from "../../../libs/repositories/index.js";
import type { ValidateInvitationResponse } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import constants from "../../../constants/constants.js";

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
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);
	const Users = Repository.get("users", context.db, context.config.db);

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
		select: ["id", "email", "username", "first_name", "last_name"],
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
