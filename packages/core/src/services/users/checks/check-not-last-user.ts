import T from "../../../translations/index.js";
import formatter from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkNotLastUser: ServiceFn<[], undefined> = async (context) => {
	const Users = new UsersRepository(context.db, context.config.db);

	const activeUserCountRes = await Users.count({
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
	});
	if (activeUserCountRes.error) return activeUserCountRes;

	const activeUserCount = formatter.parseCount(activeUserCountRes.data?.count);
	if (activeUserCount <= 1) {
		return {
			error: {
				type: "basic",
				message: T("error_cant_delete_last_user"),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkNotLastUser;
