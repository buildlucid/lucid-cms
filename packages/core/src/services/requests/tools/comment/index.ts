import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import commentOnRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_comment" satisfies AgentLucidToolName;

export const commentOnRequestAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_comment.title"),
		description:
			"Post a new comment on a review request. Comments are how to ask for changes: each withdraws approvals and blocks approval until it is resolved or closed. People taking part are notified. To answer an existing comment, use requests_reply.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(commentOnRequest, {
				transaction: true,
			})(context, {
				...input,
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				runId: execution.run.id,
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.requests_comment.summary", {
						data: { id: input.requestId },
					}),
				},
			};
		},
	});
