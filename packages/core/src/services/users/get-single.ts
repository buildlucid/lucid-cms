import T from "../../translations/index.js";
import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserResponse } from "../../types/response.js";
import type { QueryBuilderWhere } from "../../libs/query-builder/index.js";

export interface ServiceData {
	userId: number;
}

const getSingle: ServiceFn<
	[
		{
			userId: number;
			/** When true, it will only return users that are active and not soft-deleted  */
			activeUser?: boolean;
		},
	],
	UserResponse
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);
	const UsersFormatter = Formatter.get("users");

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
		data: UsersFormatter.formatSingle({
			user: userRes.data,
		}),
	};
};

export default getSingle;
