import { UsersRepository } from "../../libs/repositories/index.js";
import formatter, { usersFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserResponse } from "../../types/response.js";
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
	const Users = new UsersRepository(context.db, context.config.db);

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
			data: usersFormatter.formatMultiple({
				users: usersRes.data[0],
			}),
			count: formatter.parseCount(usersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
