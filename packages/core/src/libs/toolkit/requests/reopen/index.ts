import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsReopenInput = z.input<typeof inputSchema>;

/** Reopens a closed request, withdrawing any earlier approval as content may have changed. */
const reopen = (
	context: ServiceContext,
	input: ToolkitRequestsReopenInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: reopen } = await import(
				"../../../../services/requests/reopen.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					reopen(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.reopen.error.name" },
		message: { key: "core.toolkit.requests.reopen.error.message" },
	});

export default reopen;
