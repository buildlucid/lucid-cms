import { copy } from "../../../libs/i18n/index.js";
import { RolesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkRolesExist: ServiceFn<
	[
		{
			roleIds: number[];
			tenantKey?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	if (data.roleIds.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Roles = new RolesRepository(context.db.client, context.config.db);
	const rolesRes = await Roles.selectMultipleIdsByIds({
		ids: data.roleIds,
		tenantKey: data.tenantKey,
		validation: {
			enabled: true,
		},
	});
	if (rolesRes.error) return rolesRes;

	if (rolesRes.data.length !== data.roleIds.length) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					roleIds: {
						code: "invalid",
						message: copy("server:core.roles.not.found.message"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkRolesExist;
