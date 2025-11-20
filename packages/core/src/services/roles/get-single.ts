import T from "../../translations/index.js";
import { RolesRepository } from "../../libs/repositories/index.js";
import { rolesFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { RoleResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	RoleResponse
> = async (context, data) => {
	const Roles = new RolesRepository(context.db, context.config.db);

	const roleRes = await Roles.selectSingleById({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: T("role_not_found_message"),
				status: 404,
			},
		},
	});
	if (roleRes.error) return roleRes;

	return {
		error: undefined,
		data: rolesFormatter.formatSingle({
			role: roleRes.data,
		}),
	};
};

export default getSingle;
