import type z from "zod";
import type { User } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitUsersGetMultipleQuery = z.input<typeof querySchema>;

/** Optional actor, filters and pagination for listing users. */
export type ToolkitUsersGetMultipleInput = z.input<typeof inputSchema>;

/** Matching users and the total count before pagination. */
export type ToolkitUsersGetMultipleResult = {
	data: User[];
	count: number;
};

/** Lists users, including deleted ones unless filtered out, with the details the actor could see in the admin. */
const getMultiple = (
	context: ServiceContext,
	input: ToolkitUsersGetMultipleInput = {},
): ServiceResponse<ToolkitUsersGetMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: resolveActorUser }, { default: getMultiple }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/users/get-multiple.js"),
				]);

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			return getMultiple(context, {
				query: data.query,
				authUser: userRes.data,
			});
		},
		name: { key: "core.toolkit.users.get-multiple.error.name" },
		message: { key: "core.toolkit.users.get-multiple.error.message" },
	});

export default getMultiple;
