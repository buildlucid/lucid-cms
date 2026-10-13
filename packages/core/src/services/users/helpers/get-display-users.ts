import { usersFormatter } from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { UserDisplay } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Looks up user display details by ID, omitting null and unknown IDs. */
const getDisplayUsers: ServiceFn<
	[{ ids: Array<number | null> }],
	Map<number, UserDisplay>
> = async (context, data) => {
	const ids = [...new Set(data.ids.filter((id): id is number => id !== null))];
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultipleByIds({ ids });
	if (usersRes.error) return usersRes;

	const mediaOptions = {
		host: getBaseUrl(context),
		delivery: context.mediaDelivery,
		defaultLocale: context.config.localization.defaultLocale,
		locales: context.config.localization.locales,
	};

	return {
		error: undefined,
		data: new Map(
			(usersRes.data ?? []).map((user) => [
				user.id,
				usersFormatter.formatDisplay({ user, mediaOptions }),
			]),
		),
	};
};

export default getDisplayUsers;
