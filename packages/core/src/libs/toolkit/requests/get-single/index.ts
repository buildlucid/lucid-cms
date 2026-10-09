import type z from "zod";
import type { RequestDetail } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

/** A request to read, optionally as a user. */
export type ToolkitRequestsGetSingleInput = z.input<typeof inputSchema>;

/** Returns a request with its documents, activity, blockers, the actor's permissions and a review token. */
const getSingle = (
	context: ServiceContext,
	input: ToolkitRequestsGetSingleInput,
): ServiceResponse<RequestDetail> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSingle } = await import(
				"../../../../services/requests/get-single.js"
			);

			return runRequestService(context, {
				actor: data.actor,
				transaction: false,
				run: (context, user) => getSingle(context, { id: data.id, user }),
			});
		},
		name: { key: "core.toolkit.requests.get-single.error.name" },
		message: { key: "core.toolkit.requests.get-single.error.message" },
	});

export default getSingle;
