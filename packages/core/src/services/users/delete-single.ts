import T from "../../translations/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
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
	const Users = new UsersRepository(context.db, context.config.db);

	if (data.currentUserId === data.userId) {
		return {
			error: {
				type: "basic",
				message: T("error_cant_delete_yourself"),
				status: 400,
			},
			data: undefined,
		};
	}

	await userServices.checks.checkNotLastUser(context);

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

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
