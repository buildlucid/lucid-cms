import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import updateRequestComment from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_update_comment" satisfies AgentLucidToolName;

export const updateRequestCommentAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_update_comment.title"),
		description:
			"Resolve, close, reopen, edit or remove a comment you wrote on a review request. Comments by people and other agents can't be changed: answer them with requests_reply instead.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(updateRequestComment, {
				transaction: true,
			})(context, {
				input,
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
					summary: copy(
						`admin:core.tools.requests_update_comment.summary.${input.action}`,
						{ data: { id: input.requestId } },
					),
				},
			};
		},
	});
