import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const Roles = Repository.get("roles", context.db, context.config.db);
	const RolesFormatter = Formatter.get("roles");

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
		data: RolesFormatter.formatSingle({
			role: roleRes.data,
		}),
	};
};

export default getSingle;
