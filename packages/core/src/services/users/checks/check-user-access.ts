import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms users are visible in the current tenant scope before writes.
 * Users without tenant memberships remain global and visible to tenants.
 */
const checkUserAccess: ServiceFn<
	[
		{
			id?: number;
			ids?: number[];
			where?: Parameters<UsersRepository["selectMultipleByIds"]>[0]["where"];
		},
	],
	undefined
> = async (context, data) => {
	const ids = Array.from(
		new Set(data.ids ?? (data.id !== undefined ? [data.id] : [])),
	);

	if (ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db.client, context.config.db);
	const usersRes = await Users.selectMultipleByIds({
		ids,
		tenantKey: context.request.tenantKey,
		where: data.where,
		validation: {
			enabled: true,
		},
	});
	if (usersRes.error) return usersRes;

	if (usersRes.data.length !== ids.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.user.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkUserAccess;
