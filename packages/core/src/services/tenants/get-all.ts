import { normalizeCopy } from "../../libs/i18n/index.js";
import { UserTenantsRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { Tenant } from "../../types/response.js";
import { multiTenancyEnabled } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Returns the tenants the given user has access to. Super admins have access to every
 * configured tenant, other users only the tenants they have a membership for.
 */
const getAll: ServiceFn<
	[
		{
			authUser: LucidAuth;
		},
	],
	Tenant[]
> = async (context, data) => {
	if (!multiTenancyEnabled(context.config)) {
		return {
			error: undefined,
			data: [],
		};
	}

	if (data.authUser.superAdmin) {
		return {
			error: undefined,
			data: context.config.tenants.map((tenant) => ({
				key: tenant.key,
				name: normalizeCopy(tenant.name),
				default: tenant.default ?? false,
			})),
		};
	}

	const UserTenants = new UserTenantsRepository(
		context.db.client,
		context.config.db,
	);
	const membershipsRes = await UserTenants.selectMultiple({
		select: ["tenant_key"],
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.authUser.id,
			},
		],
	});
	if (membershipsRes.error) return membershipsRes;

	const memberKeys = (membershipsRes.data ?? []).map(
		(membership) => membership.tenant_key,
	);

	return {
		error: undefined,
		data: context.config.tenants
			.filter((tenant) => memberKeys.includes(tenant.key))
			.map((tenant) => ({
				key: tenant.key,
				name: normalizeCopy(tenant.name),
				default: tenant.default ?? false,
			})),
	};
};

export default getAll;
