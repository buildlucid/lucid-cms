import formatter from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { invalidateAuthCache } from "../../auth/helpers/auth-cache.js";
import checkNotLastUser from "../checks/check-not-last-user.js";
import checkUserAccess from "../checks/check-user-access.js";

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
	const User = new UsersRepository(context.db);

	const accessRes = await checkUserAccess(context, {
		id: data.id,
	});
	if (accessRes.error) return accessRes;

	const userRes = await User.selectSingle({
		select: ["id", "is_deleted"],
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
	if (userRes.error) return userRes;

	if (!formatter.formatBoolean(userRes.data.is_deleted)) {
		const notLastUserRes = await checkNotLastUser(context);
		if (notLastUserRes.error) return notLastUserRes;
	}

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

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteUser;
