import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import completeRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_complete";

export const completeRequestAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.requests_complete.title"),
		description: ({ mode }) =>
			mode === "routine"
				? "Complete an approved request now, publishing, unpublishing, deleting or creating its documents. Changes go live, so only complete requests your instructions call for. To complete one later, use requests_schedule."
				: "Complete an approved request now, publishing, unpublishing, deleting or creating its documents. Changes go live, so only complete requests the person asked you to. To complete one later, use requests_schedule.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		requiresConfirmation: true,
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(completeRequest, {
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
					changes: [{ type: "request", requestId: input.requestId }],
					summary: copy("admin:core.tools.requests_complete.summary", {
						data: { id: input.requestId },
					}),
				},
			};
		},
	});
