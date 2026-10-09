import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import acknowledgeRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_acknowledge" satisfies AgentLucidToolName;

export const acknowledgeRequestAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_acknowledge.title"),
		description:
			"Acknowledge targets someone else published to after a review request was opened, once you have compared what they now hold with the request. Requests can't be approved until these are acknowledged.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(acknowledgeRequest, {
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

			const count = result.data.output.acknowledged.length;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.requests_acknowledge.summary.one"
							: "admin:core.tools.requests_acknowledge.summary",
						{ data: { id: input.requestId, count } },
					),
				},
			};
		},
	});
