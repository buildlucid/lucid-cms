import T from "../../translations/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import { seedServices } from "../index.js";

const setupRequired: ServiceFn<[], { setupRequired: boolean }> = async (
	context: ServiceContext,
) => {
	try {
		const Users = new UsersRepository(context.db, context.config.db);

		const totalUserCountRes = await Users.count({
			where: [],
		});
		if (totalUserCountRes.error) return totalUserCountRes;

		const userCount = formatter.parseCount(totalUserCountRes.data?.count);
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
