import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

/** The person approving, and the review they approve. */
export type ToolkitRequestsApproveInput = z.input<typeof inputSchema>;

/** Approves a request as a person, freezing its content and targets once it has the approvals it needs. */
const approve = (
	context: ServiceContext,
	input: ToolkitRequestsApproveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: approve } = await import(
				"../../../../services/requests/approve.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					approve(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.approve.error.name" },
		message: { key: "core.toolkit.requests.approve.error.message" },
	});

export default approve;
