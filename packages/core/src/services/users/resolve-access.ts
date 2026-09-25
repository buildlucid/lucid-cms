import formatter, {
	userPermissionsFormatter,
} from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Loads current role permissions, rejecting deleted or locked users. */
const resolveUserAccess: ServiceFn<
	[{ userId: number }],
	{ userId: number; superAdmin: boolean; permissions: string[] }
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: data.userId },
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
			{
				key: "is_locked",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				type: "authorisation",
				status: 401,
			},
		},
	});
	if (userRes.error) return userRes;

	const superAdmin = formatter.formatBoolean(userRes.data.super_admin ?? false);
	const { permissions } = userPermissionsFormatter.formatMultiple({
		roles: userRes.data.roles ?? [],
	});

	return {
		error: undefined,
		data: { userId: data.userId, superAdmin, permissions },
	};
};

export default resolveUserAccess;
