import executeHooks from "../../libs/hooks/execute-hooks.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ToolkitMediaNotifyChangeInput } from "../../libs/toolkit/media/notify-change/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "../document-references/notify-dependants.js";

/** Runs change subscribers in the caller's context. IDs need not still exist. */
const notifyChange: ServiceFn<
	[ToolkitMediaNotifyChangeInput],
	undefined
> = async (context, data) => {
	const ids = [...new Set(data.ids)];
	if (ids.length === 0) return { error: undefined, data: undefined };

	const emitted = await executeHooks(
		context,
		{
			service: "media",
			event: "afterChange",
			config: context.config,
		},
		{
			meta: {},
			data: { ids, ...(data.change ? { change: data.change } : {}) },
		},
	);
	if (emitted.error) return emitted;

	const related = await notifyDependants(context, {
		resource: "media",
		table: "lucid_media",
		ids,
	});
	if (related.error) return related;

	const Users = new UsersRepository(context.db);

	const users = await Users.selectProfilePictureUserIds({ mediaIds: ids });
	if (users.error) return users;

	return notifyDependants(context, {
		resource: "users",
		table: "lucid_users",
		ids: users.data,
	});
};

export default notifyChange;
