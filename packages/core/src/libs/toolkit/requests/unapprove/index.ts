import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsUnapproveInput = z.input<typeof inputSchema>;

/** Withdraws the person's approval. Other approvals still count, but an approved request needs approving again. */
const unapprove = (
	context: ServiceContext,
	input: ToolkitRequestsUnapproveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: unapprove } = await import(
				"../../../../services/requests/unapprove.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					unapprove(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.unapprove.error.name" },
		message: { key: "core.toolkit.requests.unapprove.error.message" },
	});

export default unapprove;
