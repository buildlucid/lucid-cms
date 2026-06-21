import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import { userServices } from "../index.js";

const deleteSingle: ServiceFn<
	[
		{
			userId: number;
			currentUserId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	if (data.currentUserId === data.userId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.users.self.delete.denied"),
				status: 400,
			},
			data: undefined,
		};
	}

	const accessRes = await userServices.checks.checkUserAccess(context, {
		id: data.userId,
	});
	if (accessRes.error) return accessRes;

	const notLastUserRes = await userServices.checks.checkNotLastUser(context);
	if (notLastUserRes.error) return notLastUserRes;

	const deleteUserRes = await Users.updateSingle({
		data: {
			is_deleted: true,
			is_deleted_at: new Date().toISOString(),
			deleted_by: data.currentUserId,
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["id", "first_name", "last_name", "email"],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (deleteUserRes.error) return deleteUserRes;

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
