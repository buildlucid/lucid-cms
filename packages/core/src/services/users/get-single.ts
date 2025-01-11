import T from "../../translations/index.js";
import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserResponse } from "../../types/response.js";

export interface ServiceData {
	userId: number;
}

const getSingle: ServiceFn<
	[
		{
			userId: number;
		},
	],
	UserResponse
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);
	const UsersFormatter = Formatter.get("users");

	const userRes = await Users.selectSingleById({
		id: data.userId,
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
