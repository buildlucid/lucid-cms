import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const restoreMultiple: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db, context.config.db);

	const updateRes = await Users.updateSingle({
		data: {
			is_deleted: false,
			is_deleted_at: null,
			deleted_by: null,
		},
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default restoreMultiple;
