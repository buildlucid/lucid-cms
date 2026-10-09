import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsCommentsUpdateInput = z.input<typeof inputSchema>;

/** Rewrites the actor's own comment or reply, restricting agent comments to their original agent identity. */
const update = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsUpdateInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, commentId, ...data }) => {
			const { default: updateComment } = await import(
				"../../../../../services/requests/update-comment.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					updateComment(context, {
						...data,
						eventId: commentId,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.comments.update.error.name" },
		message: { key: "core.toolkit.requests.comments.update.error.message" },
	});

export default update;
