import type z from "zod";
import type getMultipleService from "../../../../services/users/get-multiple.js";
import type { ContentList } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { ToolkitListFilterInput } from "../../types.js";
import {
	parseListQuery,
	runToolkitService,
	toPagination,
} from "../../utils.js";
import { inputSchema, querySchema } from "./schema.js";

/** Optional actor, filters and pagination for listing users. */
export type ToolkitUsersGetMultipleInput = Omit<
	z.input<typeof inputSchema>,
	"filter"
> & {
	filter?: ToolkitListFilterInput<z.input<typeof querySchema>>;
};

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

			const queryRes = await parseListQuery(querySchema, data);
			if (queryRes.error) return queryRes;

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			const result = await getMultiple(context, {
				query: queryRes.data,
				authUser: userRes.data,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data,
					pagination: toPagination(result.data.count, data),
				},
			};
		},
		name: { key: "core.toolkit.users.get-multiple.error.name" },
		message: { key: "core.toolkit.users.get-multiple.error.message" },
	});

export default getMultiple;
