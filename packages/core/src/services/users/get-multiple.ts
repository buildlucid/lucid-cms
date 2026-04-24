import formatter, { usersFormatter } from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/users.js";
import type { LucidAuth } from "../../types/hono.js";
import type { User } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
			authUser: LucidAuth;
		},
	],
	{
		data: User[];
		count: number;
	}
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

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
				authUser: data.authUser,
				host: getBaseUrl(context),
				locales: context.config.localization.locales.map(
					(locale) => locale.code,
				),
			}),
			count: formatter.parseCount(usersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
