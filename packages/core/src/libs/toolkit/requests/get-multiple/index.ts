import type z from "zod";
import type getMultipleService from "../../../../services/requests/get-multiple.js";
import type { ContentList } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService, toPagination } from "../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitRequestsGetMultipleQuery = z.input<typeof querySchema>;

/** Optional actor, filters and pagination for listing requests. */
export type ToolkitRequestsGetMultipleInput = z.input<typeof inputSchema>;

/** A page of matching requests as `items`, with its `pagination`. */
export type ToolkitRequestsGetMultipleResult = ContentList<
	NonNullable<
		Awaited<ReturnType<typeof getMultipleService>>["data"]
	>["data"][number]
>;

/** Lists requests the actor can read, a page at a time. */
const getMultiple = (
	context: ServiceContext,
	input: ToolkitRequestsGetMultipleInput = {},
): ServiceResponse<ToolkitRequestsGetMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: resolveActorUser }, { default: getMultiple }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/requests/get-multiple.js"),
				]);

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			const result = await getMultiple(context, {
				user: userRes.data,
				query: data.query,
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
		name: { key: "core.toolkit.requests.get-multiple.error.name" },
		message: { key: "core.toolkit.requests.get-multiple.error.message" },
	});

export default getMultiple;
