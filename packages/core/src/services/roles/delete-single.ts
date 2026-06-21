import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { RolesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import checkRoleAccess from "./checks/check-role-access.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);

	const roleRes = await checkRoleAccess(context, {
		id: data.id,
	});
	if (roleRes.error) return roleRes;

	if (formatter.formatBoolean(roleRes.data.locked)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	const deleteRolesRes = await Roles.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRolesRes.error) return deleteRolesRes;

	if (deleteRolesRes.data.length === 0) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
