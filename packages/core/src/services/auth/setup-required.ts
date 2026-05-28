import formatter from "../../libs/formatters/index.js";
import { serverText } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import { seedServices, syncServices } from "../index.js";

const setupRequired: ServiceFn<[], { setupRequired: boolean }> = async (
	context: ServiceContext,
) => {
	try {
		const Users = new UsersRepository(context.db.client, context.config.db);

		const totalUserCountRes = await Users.count({
			where: [],
		});
		if (totalUserCountRes.error) return totalUserCountRes;

		const userCount = formatter.parseCount(totalUserCountRes.data?.count);
		const setupRequired = userCount === 0;

		if (setupRequired) {
			const initialSeedRes = await Promise.all([
				seedServices.defaultOptions(context),
				syncServices.syncRoles(context),
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
	} catch (_error) {
		return {
			error: {
				type: "basic",
				message: serverText("core.services.errors.unknown.message"),
			},
			data: undefined,
		};
	}
};

export default setupRequired;
