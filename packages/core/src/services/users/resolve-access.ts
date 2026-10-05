import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import loadActiveUser from "./helpers/load-active-user.js";

/** Loads current role permissions, rejecting deleted or locked users. */
const resolveUserAccess: ServiceFn<
	[{ userId: number }],
	{ userId: number; superAdmin: boolean; permissions: string[] }
> = async (context, data) => {
	const userRes = await loadActiveUser(context, { id: data.userId });
	if (userRes.error) return userRes;

	if (!userRes.data) {
		return {
			error: {
				type: "authorisation",
				message: copy("server:core.permissions.unauthorized"),
				status: 401,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			userId: data.userId,
			superAdmin: userRes.data.superAdmin,
			permissions: userRes.data.permissions ?? [],
		},
	};
};

export default resolveUserAccess;
