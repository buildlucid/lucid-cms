import { RolesRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);

	const roleRes = await Roles.selectSingle({
		select: ["id", "locked"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (roleRes.error) return roleRes;

	if (roleRes.data.locked === context.config.db.getDefault("boolean", "true")) {
		return {
			error: {
				type: "basic",
				message: T("you_do_not_have_permission_to_perform_this_action"),
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

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
