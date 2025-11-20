import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
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
	const User = new UsersRepository(context.db, context.config.db);

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

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteUser;
