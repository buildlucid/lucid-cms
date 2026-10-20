import type z from "zod";
import type getMultipleService from "../../../../services/users/get-multiple.js";
import type { ContentList } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService, toPagination } from "../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitUsersGetMultipleQuery = z.input<typeof querySchema>;

/** Optional actor, filters and pagination for listing users. */
export type ToolkitUsersGetMultipleInput = z.input<typeof inputSchema>;

/** A page of matching users as `items`, with its `pagination`. */
export type ToolkitUsersGetMultipleResult = ContentList<
	NonNullable<
		Awaited<ReturnType<typeof getMultipleService>>["data"]
	>["data"][number]
>;

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

			const result = await getMultiple(context, {
				query: data.query,
				authUser: userRes.data,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data,
					pagination: toPagination(result.data.count, data.query),
				},
			};
		},
		name: { key: "core.toolkit.users.get-multiple.error.name" },
		message: { key: "core.toolkit.users.get-multiple.error.message" },
	});

export default getMultiple;
