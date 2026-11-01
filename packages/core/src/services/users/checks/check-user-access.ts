import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Checks target users exist and can be managed by the actor. Only super admins can manage super
 * admins.
 */
const checkUserAccess: ServiceFn<
	[
		{
			auth: Pick<LucidActor, "superAdmin">;
			id?: number;
			ids?: number[];
			where?: Parameters<UsersRepository["selectMultipleByIds"]>[0]["where"];
		},
	],
	undefined
> = async (context, data) => {
	const ids = Array.from(
		new Set(data.ids ?? (data.id !== undefined ? [data.id] : [])),
	);

	if (ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultipleByIds({
		ids,
		where: data.where,
		validation: {
			enabled: true,
		},
	});
	if (usersRes.error) return usersRes;

	if (usersRes.data.length !== ids.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.user.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (
		!data.auth.superAdmin &&
		usersRes.data.some((user) => formatter.formatBoolean(user.super_admin))
	) {
		return {
			error: {
				type: "forbidden",
				message: copy("server:core.users.super.admin.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkUserAccess;
