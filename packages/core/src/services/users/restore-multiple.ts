import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import notifyDependants from "../document-references/notify-dependants.js";
import checkUserAccess from "./checks/check-user-access.js";

const restoreMultiple: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);

	const accessRes = await checkUserAccess(context, {
		ids: data.ids,
	});
	if (accessRes.error) return accessRes;

	const updateRes = await Users.updateSingle({
		data: {
			is_deleted: false,
			is_deleted_at: null,
			deleted_by: null,
		},
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	const references = await notifyDependants(context, {
		resource: "users",
		table: "lucid_users",
		ids: data.ids,
	});
	if (references.error) return references;

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default restoreMultiple;
