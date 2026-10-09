import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import runRequestService from "../../run-request-service.js";
import { inputSchema } from "./schema.js";

/** A comment, or a reply to one. */
export type ToolkitRequestsCommentsCreateInput = z.input<typeof inputSchema>;

/** Adds a comment or reply, withdrawing approvals only for top-level comments. */
const create = (
	context: ServiceContext,
	input: ToolkitRequestsCommentsCreateInput,
): ServiceResponse<{ id: number }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, replyTo, ...data }) => {
			const { default: createComment } = await import(
				"../../../../../services/requests/create-comment.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					createComment(context, {
						...data,
						parentId: replyTo,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.comments.create.error.name" },
		message: { key: "core.toolkit.requests.comments.create.error.message" },
	});

export default create;
