import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const UserLogins = Repository.get(
		"user-logins",
		context.db,
		context.config.db,
	);
	const UserLoginsFormatter = Formatter.get("user-logins");

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
			data: UserLoginsFormatter.formatMultiple({
				userLogins: userLoginsRes.data[0],
			}),
			count: Formatter.parseCount(userLoginsRes.data[1]?.count),
		},
	};
};

export default getMultiple;
