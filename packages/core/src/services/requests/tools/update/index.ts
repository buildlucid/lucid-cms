import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import updateRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_update" satisfies AgentLucidToolName;

export const updateRequestAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_update.title"),
		description:
			"Change a review request: its title, description or reviewers, its documents and their targets, or close or reopen it. List only the changes to make. Read it with requests_get first. To change a proposal's content, use documents_update with requestId.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(updateRequest, {
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
					summary: copy("admin:core.tools.requests_update.summary", {
						data: { id: input.requestId },
					}),
				},
			};
		},
	});
