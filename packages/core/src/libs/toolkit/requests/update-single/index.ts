import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
import { inputSchema } from "./schema.js";

/** Request details to change. Omitted details keep their values. */
export type ToolkitRequestsUpdateSingleInput = z.input<typeof inputSchema>;

/** Updates the request's title, description or reviewers without withdrawing approvals. */
const updateSingle = (
	context: ServiceContext,
	input: ToolkitRequestsUpdateSingleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const { default: updateSingle } = await import(
				"../../../../services/requests/update-single.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					updateSingle(context, {
						...data,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.update-single.error.name" },
		message: { key: "core.toolkit.requests.update-single.error.message" },
	});

export default updateSingle;
