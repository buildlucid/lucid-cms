import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const RolesRepo = Repository.get("roles", context.db, context.config.db);

	const deleteRoles = await RolesRepo.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});

	if (deleteRoles.length === 0) {
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
