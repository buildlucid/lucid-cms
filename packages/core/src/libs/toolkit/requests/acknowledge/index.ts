import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import type { ToolkitRequestTarget } from "../types.js";
import { inputSchema } from "./schema.js";

/** Targets to acknowledge, as they were when the request was read. */
export type ToolkitRequestsAcknowledgeInput = z.input<typeof inputSchema>;

/** Acknowledges targets someone else published to since the request was opened, so it can be approved. */
const acknowledge = (
	context: ServiceContext,
	input: ToolkitRequestsAcknowledgeInput,
): ServiceResponse<{ targets: ToolkitRequestTarget[] }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: acknowledge } = await import(
				"../../../../services/requests/acknowledge.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					acknowledge(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.acknowledge.error.name" },
		message: { key: "core.toolkit.requests.acknowledge.error.message" },
	});

export default acknowledge;
