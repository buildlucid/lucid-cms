import { RolesRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/roles.js";
import formatter, { rolesFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { RoleResponse } from "../../types/response.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: RoleResponse[];
		count: number;
	}
> = async (context, data) => {
	const Roles = new RolesRepository(context.db, context.config.db);

	const rolesRes = await Roles.selectMultipleFilteredFixed({
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (rolesRes.error) return rolesRes;

	return {
		error: undefined,
		data: {
			data: rolesFormatter.formatMultiple({
				roles: rolesRes.data[0],
			}),
			count: formatter.parseCount(rolesRes.data[1]?.count),
		},
	};
};

export default getMultiple;
