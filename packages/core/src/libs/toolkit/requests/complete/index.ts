import type z from "zod";
import type { RequestExecutionReceipt } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
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
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: complete },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/requests/complete.js"),
			]);

			return serviceWrapper(
				async (
					context: ServiceContext,
				): ServiceResponse<RequestExecutionReceipt> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return complete(context, {
						...data,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.complete.error.name" },
		message: { key: "core.toolkit.requests.complete.error.message" },
	});

export default complete;
