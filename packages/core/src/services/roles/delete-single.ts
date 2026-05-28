import { serverText } from "../../libs/i18n/index.js";
import { RolesRepository } from "../../libs/repositories/index.js";
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
				message: serverText("core.permissions.denied"),
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
