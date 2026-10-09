import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

/** A top-level comment to resolve, close or reopen. */
export type ToolkitRequestsCommentsResolveInput = z.input<typeof inputSchema>;

/** Resolves, closes or reopens a comment's thread on an open request. */
const resolve = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsResolveInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, commentId, ...data }) => {
			const { default: updateCommentResolution } = await import(
				"../../../../../services/requests/update-comment-resolution.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					updateCommentResolution(context, {
						...data,
						eventId: commentId,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.comments.resolve.error.name" },
		message: { key: "core.toolkit.requests.comments.resolve.error.message" },
	});

export default resolve;
