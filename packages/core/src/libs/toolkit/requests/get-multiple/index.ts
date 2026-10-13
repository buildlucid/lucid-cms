import type z from "zod";
import type getMultipleService from "../../../../services/requests/get-multiple.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitRequestsGetMultipleQuery = z.input<typeof querySchema>;

/** Optional actor, filters and pagination for listing requests. */
export type ToolkitRequestsGetMultipleInput = z.input<typeof inputSchema>;

/** Matching requests and the total count before pagination. */
export type ToolkitRequestsGetMultipleResult = NonNullable<
	Awaited<ReturnType<typeof getMultipleService>>["data"]
>;

/** Lists requests the actor can read, with the total count before pagination. */
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

			return getMultiple(context, { user: userRes.data, query: data.query });
		},
		name: { key: "core.toolkit.requests.get-multiple.error.name" },
		message: { key: "core.toolkit.requests.get-multiple.error.message" },
	});

export default getMultiple;
