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
	const Roles = new RolesRepository(context.db, context.config.db);

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
