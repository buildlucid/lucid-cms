import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsCommentsDeleteInput = z.input<typeof inputSchema>;

/** Deletes the actor's comment and replies, allowing super admins and the system to moderate only without an agent. */
const deleteComment = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsDeleteInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, commentId, ...data }) => {
			const { default: deleteComment } = await import(
				"../../../../../services/requests/delete-comment.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					deleteComment(context, {
						...data,
						eventId: commentId,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.comments.delete.error.name" },
		message: { key: "core.toolkit.requests.comments.delete.error.message" },
	});

export default deleteComment;
