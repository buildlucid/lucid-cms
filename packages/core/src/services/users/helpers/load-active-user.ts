import formatter, {
	userPermissionsFormatter,
} from "../../../libs/formatters/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Loads an active user with their current permissions. Null when deleted or locked. */
const loadActiveUser: ServiceFn<[{ id: number }], LucidUser | null> = async (
	context,
	data,
) => {
	const Users = new UsersRepository(context.db);
	const userRes = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: data.id },
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
	});
	if (userRes.error) return userRes;

	if (!userRes.data) return { error: undefined, data: null };

	return {
		error: undefined,
		data: {
			id: userRes.data.id,
			email: userRes.data.email,
			username: userRes.data.username,
			superAdmin: formatter.formatBoolean(userRes.data.super_admin),
			permissions: userPermissionsFormatter.formatMultiple({
				roles: userRes.data.roles ?? [],
			}).permissions,
		},
	};
};

export default loadActiveUser;
