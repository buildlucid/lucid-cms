import type { QueryBuilderWhere } from "../../libs/db/query-builder/index.js";
import { usersFormatter } from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { User } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			userId: number;
			/** When true, it will only return users that are active and not soft-deleted  */
			activeUser?: boolean;
			authUser: LucidAuth;
		},
	],
	User
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	const userQueryWhere: QueryBuilderWhere<"lucid_users"> = [
		{
			key: "id",
			operator: "=",
			value: data.userId,
		},
	];
	if (data.activeUser) {
		userQueryWhere.push({
			key: "is_deleted",
			operator: "=",
			value: context.config.db.getDefault("boolean", "false"),
		});
	}

	const userRes = await Users.selectSinglePreset({
		where: userQueryWhere,
		validation: {
			enabled: true,
			defaultError: {
				message: T("user_not_found_message"),
				status: 404,
			},
		},
	});
	if (userRes.error) return userRes;

	return {
		error: undefined,
		data: usersFormatter.formatSingle({
			user: userRes.data,
			authUser: data.authUser,
			host: getBaseUrl(context),
			locales: context.config.localization.locales.map((locale) => locale.code),
		}),
	};
};

export default getSingle;
