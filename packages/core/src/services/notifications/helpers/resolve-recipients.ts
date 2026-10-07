import type { AnyNotificationDefinition } from "../../../libs/notifications/types.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Who a notification goes to. Named recipients are checked to be active people,
 * audience types go to the configured roles or everyone with the permission,
 * and the person who caused it is never told about their own action.
 */
const resolveRecipients: ServiceFn<
	[
		{
			definition: AnyNotificationDefinition;
			roleIds: number[] | null;
			recipients: number[] | undefined;
			actorUserId: number | null;
		},
	],
	number[]
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	let ids: number[] = [];
	if (data.definition.audience === "recipients") {
		const named = [...new Set(data.recipients ?? [])].filter(
			(id) => id !== data.actorUserId,
		);
		if (named.length === 0) return { error: undefined, data: [] };

		const activeRes = await Users.selectActiveIds({ ids: named });
		if (activeRes.error) return activeRes;
		ids = activeRes.data;
	} else if (data.roleIds !== null) {
		const rolesRes = await Users.selectIdsByRoles({ roleIds: data.roleIds });
		if (rolesRes.error) return rolesRes;
		ids = rolesRes.data;
	} else {
		const usersRes = await Users.selectIdsWithPermission({
			permission: data.definition.audience.permission,
		});
		if (usersRes.error) return usersRes;
		ids = usersRes.data;
	}

	return {
		error: undefined,
		data: ids.filter((id) => id !== data.actorUserId),
	};
};

export default resolveRecipients;
