import T from "../../../translations/index.js";
import Formatter from "../../../libs/formatters/index.js";
import Repository from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkNotLastUser: ServiceFn<[], undefined> = async (context) => {
	const UsersRepo = Repository.get("users", context.db, context.config.db);

	const activeUserCountRes = await UsersRepo.activeCount();
	const activeUserCount = Formatter.parseCount(activeUserCountRes?.count);
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
