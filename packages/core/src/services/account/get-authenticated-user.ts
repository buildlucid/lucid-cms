import T from "../../translations/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserResponse } from "../../types.js";
import type { LucidAuth } from "../../types/hono.js";
import { usersFormatter } from "../../libs/formatters/index.js";

const getAuthenticatedUser: ServiceFn<
	[
		{
			userId: number;
			authUser: LucidAuth;
		},
	],
	UserResponse
> = async (context, data) => {
	const Users = new UsersRepository(context.db, context.config.db);

	const userRes = await Users.selectSinglePreset({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("user_not_found_message"),
				status: 404,
			},
		},
	});
	if (userRes.error) return userRes;

	return {
		error: undefined,
		data: usersFormatter.formatSingle({
			user: userRes.data,
			authUser: data.authUser,
		}),
	};
};

export default getAuthenticatedUser;
