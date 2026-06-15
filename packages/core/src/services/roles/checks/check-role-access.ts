import { copy } from "../../../libs/i18n/index.js";
import { RolesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Loads a role through the current tenant scope before role mutations.
 * Global roles stay visible to tenant requests, matching role list reads.
 */
const checkRoleAccess: ServiceFn<
	[
		{
			id: number;
		},
	],
	NonNullable<Awaited<ReturnType<RolesRepository["selectSingleById"]>>["data"]>
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);

	const roleRes = await Roles.selectSingleById({
		id: data.id,
		tenantKey: context.request.tenantKey,
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
		data: roleRes.data,
	};
};

export default checkRoleAccess;
