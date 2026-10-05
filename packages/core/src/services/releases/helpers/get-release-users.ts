import { releasesFormatter } from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ReleaseUser } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Looks up the people shown on releases, keyed by user ID. */
const getReleaseUsers: ServiceFn<
	[{ ids: Array<number | null> }],
	Map<number, ReleaseUser>
> = async (context, data) => {
	const ids = [...new Set(data.ids.filter((id): id is number => id !== null))];
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultipleByIds({ ids });
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: releasesFormatter.formatUsers({
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

export default getReleaseUsers;
