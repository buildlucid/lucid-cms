import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import { userServices } from "../index.js";

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

	const Users = new UsersRepository(context.db.client, context.config.db);

	const accessRes = await userServices.checks.checkUserAccess(context, {
		ids: data.ids,
	});
	if (accessRes.error) return accessRes;

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

	await invalidateAuthCache(context.kv);

	return {
		error: undefined,
		data: undefined,
	};
};

export default restoreMultiple;
