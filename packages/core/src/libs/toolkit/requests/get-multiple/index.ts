import type z from "zod";
import type { RequestSummary } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitRequestsGetMultipleQuery = z.input<typeof querySchema>;

/** Optional actor, filters and pagination for listing requests. */
export type ToolkitRequestsGetMultipleInput = z.input<typeof inputSchema>;

/** Matching requests and the total count before pagination. */
export type ToolkitRequestsGetMultipleResult = {
	data: RequestSummary[];
	count: number;
};

/** Lists requests the actor can read, with the total count before pagination. */
const getMultiple = (
	context: ServiceContext,
	input: ToolkitRequestsGetMultipleInput = {},
): ServiceResponse<ToolkitRequestsGetMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultiple } = await import(
				"../../../../services/requests/get-multiple.js"
			);

			return runRequestService(context, {
				actor: data.actor,
				transaction: false,
				run: (context, user) =>
					getMultiple(context, { user, query: data.query }),
			});
		},
		name: { key: "core.toolkit.requests.get-multiple.error.name" },
		message: { key: "core.toolkit.requests.get-multiple.error.message" },
	});

export default getMultiple;
