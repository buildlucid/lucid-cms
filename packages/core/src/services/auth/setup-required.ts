import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import { seedServices } from "../index.js";

const setupRequired: ServiceFn<[], { setupRequired: boolean }> = async (
	context: ServiceContext,
) => {
	try {
		const Users = Repository.get("users", context.db, context.config.db);

		const totalUserCountRes = await Users.count({
			where: [],
		});
		if (totalUserCountRes.error) return totalUserCountRes;

		const userCount = Formatter.parseCount(totalUserCountRes.data?.count);
		const setupRequired = userCount === 0;

		if (setupRequired) {
			const initialSeedRes = await Promise.all([
				seedServices.defaultOptions(context),
				seedServices.defaultRoles(context),
			]);
			for (const res of initialSeedRes) {
				if (res.error) return res;
			}
		}

		return {
			error: undefined,
			data: {
				setupRequired,
			},
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message: T("unknown_service_error_message"),
			},
			data: undefined,
		};
	}
};

export default setupRequired;
