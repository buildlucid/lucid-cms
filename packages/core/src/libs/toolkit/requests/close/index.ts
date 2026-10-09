import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsCloseInput = z.input<typeof inputSchema>;

/** Closes a request without completing it, allowing it to be reopened later. */
const close = (
	context: ServiceContext,
	input: ToolkitRequestsCloseInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: close } = await import(
				"../../../../services/requests/close.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					close(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.close.error.name" },
		message: { key: "core.toolkit.requests.close.error.message" },
	});

export default close;
