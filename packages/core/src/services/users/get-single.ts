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
	const UsersRepo = Repository.get("users", context.db, context.config.db);
	const UsersFormatter = Formatter.get("users");

	const user = await UsersRepo.selectSingleById({
		id: data.userId,
		config: context.config,
	});

	if (!user) {
		return {
			error: {
				type: "basic",
				message: T("user_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: UsersFormatter.formatSingle({
			user: user,
		}),
	};
};

export default getSingle;
