import { rolesFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { RolesRepository } from "../../libs/repositories/index.js";
import type { Role } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	Role
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);

	const roleRes = await Roles.selectSingleById({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.roles.not.found.message"),
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
