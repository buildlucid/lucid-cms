import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { invalidateAuthCache } from "../../auth/helpers/auth-cache.js";
import { userServices } from "../../index.js";

/**
 * Deletes a single user
 */
const deleteUser: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const User = new UsersRepository(context.db.client, context.config.db);

	await userServices.checks.checkNotLastUser(context);

	const deleteRes = await User.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	await invalidateAuthCache(context.kv);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteUser;
