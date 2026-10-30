import formatter, { usersFormatter } from "../../libs/formatters/index.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/users.js";
import type { LucidActor } from "../../types/hono.js";
import type { User } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists users for pickers, assignees and mentions, requiring `users:read` for email addresses and filtering or sorting by them. */
const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
			authUser: LucidActor;
		},
	],
	{
		data: User[];
		count: number;
	}
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const canReadEmails = hasAccess({
		user: data.authUser,
		requiredPermissions: [Permissions.UsersRead],
	});
	//* without users:read people find each other by name, so email filters and sorts can't reveal addresses
	const { email: _email, ...filter } = data.query.filter ?? {};
	const query = canReadEmails
		? data.query
		: {
				...data.query,
				filter,
				filterOr: data.query.filterOr?.map((group) =>
					group.filter((condition) => condition.key !== "email"),
				),
				sort: data.query.sort?.filter((sort) => sort.key !== "email"),
			};

	const usersRes = await Users.selectMultipleFilteredFixed({
		queryParams: query,
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
				mediaOptions: {
					host: getBaseUrl(context),
					delivery: context.mediaDelivery,
					defaultLocale: context.config.localization.defaultLocale,
					locales: context.config.localization.locales,
				},
			}),
			count: formatter.parseCount(usersRes.data[1]?.count),
		},
	};
};

export default getMultiple;
