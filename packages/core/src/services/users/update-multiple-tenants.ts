import { copy } from "../../libs/i18n/index.js";
import { UserTenantsRepository } from "../../libs/repositories/index.js";
import { getTenantConfig } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Replaces a user's tenant memberships with the given tenant keys.
 */
const updateMultipleTenants: ServiceFn<
	[
		{
			userId: number;
			tenantKeys?: string[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.tenantKeys === undefined) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const tenantKeys = Array.from(new Set(data.tenantKeys));

	const unknownTenant = tenantKeys.find(
		(key) => getTenantConfig(context.config, key) === undefined,
	);
	if (unknownTenant !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tenants.unknown", {
					data: { key: unknownTenant },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const UserTenants = new UserTenantsRepository(
		context.db.client,
		context.config.db,
	);

	const deleteMultipleRes = await UserTenants.deleteMultiple({
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteMultipleRes.error) return deleteMultipleRes;

	if (tenantKeys.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createMultipleRes = await UserTenants.createMultiple({
		data: tenantKeys.map((key) => ({
			user_id: data.userId,
			tenant_key: key,
		})),
	});
	if (createMultipleRes.error) return createMultipleRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMultipleTenants;
