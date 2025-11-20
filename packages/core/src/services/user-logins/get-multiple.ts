import { UserLoginsRepository } from "../../libs/repositories/index.js";
import formatter, { userLoginsFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserLoginResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/user-logins.js";

const getMultiple: ServiceFn<
	[
		{
			userId: number;
			query: GetMultipleQueryParams;
		},
	],
	{
		data: UserLoginResponse[];
		count: number;
	}
> = async (context, data) => {
	const UserLogins = new UserLoginsRepository(context.db, context.config.db);

	const userLoginsRes = await UserLogins.selectMultipleFiltered({
		select: [
			"id",
			"user_id",
			"token_id",
			"auth_method",
			"ip_address",
			"user_agent",
			"created_at",
		],
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (userLoginsRes.error) return userLoginsRes;

	return {
		error: undefined,
		data: {
			data: userLoginsFormatter.formatMultiple({
				userLogins: userLoginsRes.data[0],
			}),
			count: formatter.parseCount(userLoginsRes.data[1]?.count),
		},
	};
};

export default getMultiple;
