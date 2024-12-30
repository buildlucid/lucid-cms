import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			userId: number;
			currentUserId: number;
		},
	],
	undefined
> = async (context, data) => {
	const UsersRepo = Repository.get("users", context.db, context.config.db);

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

	await context.services.user.checks.checkNotLastUser(context);

	const deleteUserRes = await UsersRepo.updateSingle({
		data: {
			isDeleted: true,
			isDeletedAt: new Date().toISOString(),
			deletedBy: data.currentUserId,
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
	});

	if (deleteUserRes === undefined) {
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
