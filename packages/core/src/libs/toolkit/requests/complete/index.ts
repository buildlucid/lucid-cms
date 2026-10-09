import type z from "zod";
import type { RequestExecutionReceipt } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

/** An approved request to complete. */
export type ToolkitRequestsCompleteInput = z.input<typeof inputSchema>;

/** Queues an approved request for completion, returning its job ID while the job rechecks request state and the actor's permissions. */
const complete = (
	context: ServiceContext,
	input: ToolkitRequestsCompleteInput,
): ServiceResponse<RequestExecutionReceipt> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: complete } = await import(
				"../../../../services/requests/complete.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					complete(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.complete.error.name" },
		message: { key: "core.toolkit.requests.complete.error.message" },
	});

export default complete;
