import T from "../../translations/index.js";
import { RolesRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import constants from "../../constants/constants.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import { roleServices } from "../index.js";

const defaultRoles: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	try {
		const Roles = new RolesRepository(context.db, context.config.db);

		const totalRoleCountRes = await Roles.count({
			where: [],
			validation: {
				enabled: true,
			},
		});
		if (totalRoleCountRes.error) return totalRoleCountRes;

		if (formatter.parseCount(totalRoleCountRes.data?.count) > 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const rolePromises = [];
		for (const role of constants.seedDefaults.roles) {
			rolePromises.push(
				serviceWrapper(roleServices.createSingle, {
					transaction: false,
				})(context, {
					name: role.name,
					description: role.description,
					permissions: role.permissions,
				}),
			);
		}
		await Promise.all(rolePromises);

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message: T("roles_error_occurred_saving_default"),
			},
			data: undefined,
		};
	}
};

export default defaultRoles;
