import { requestsFormatter } from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { RequestUser } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const getRequestUsers: ServiceFn<
	[{ ids: Array<number | null> }],
	Map<number, RequestUser>
> = async (context, data) => {
	const ids = [...new Set(data.ids.filter((id): id is number => id !== null))];
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultipleByIds({ ids });
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: requestsFormatter.formatUsers({
			users: usersRes.data ?? [],
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				defaultLocale: context.config.localization.defaultLocale,
				locales: context.config.localization.locales,
			},
		}),
	};
};

export default getRequestUsers;
