import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserResponse } from "../../types/response.js";
import type { LucidAuth } from "../../types/hono.js";
import type { GetMultipleQueryParams } from "../../schemas/users.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: UserResponse[];
		count: number;
	}
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);
	const UsersFormatter = Formatter.get("users");

	const usersRes = await Users.selectMultipleFilteredFixed({
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: {
			data: UsersFormatter.formatMultiple({
				users: usersRes.data[0],
			}),
			count: Formatter.parseCount(usersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
