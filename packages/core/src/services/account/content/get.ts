import { usersFormatter } from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { Account } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns the public account profile for a resolved user principal. */
const get: ServiceFn<[{ userId: number }], Account> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	const userRes = await Users.selectSingleContentAccount({
		userId: data.userId,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.user.not.found.message"),
				status: 404,
			},
		},
	});
	if (userRes.error) return userRes;

	return {
		error: undefined,
		data: usersFormatter.formatContentAccount({
			user: userRes.data,
			host: getBaseUrl(context),
		}),
	};
};

export default get;
