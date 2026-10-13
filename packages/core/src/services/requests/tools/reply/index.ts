import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import commentOnRequest from "../comment/handler.js";
import { outputSchema } from "../comment/schema.js";
import { inputSchema } from "./schema.js";

const name = "requests_reply";

export const replyToRequestAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_reply.title"),
		description:
			"Reply to a comment on a request, using a comment ID from requests_get. Replies join its thread and don't block approval. To raise something new, use requests_comment.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(commentOnRequest, {
				transaction: true,
			})(context, {
				requestId: input.requestId,
				body: input.body,
				replyTo: input.commentId,
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					changes: [{ type: "request", requestId: input.requestId }],
					summary: copy("admin:core.tools.requests_reply.summary", {
						data: { id: input.requestId },
					}),
				},
			};
		},
	});
