import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import acknowledgeRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "requests_acknowledge";

export const acknowledgeRequestAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineTool({
		name,
		title: copy("admin:core.tools.requests_acknowledge.title"),
		description:
			"Acknowledge targets someone else published to after the request was opened, once you have compared what they now hold with the request. Requests can't be approved until these are acknowledged.",
		input: inputSchema,
		output: outputSchema,
		agent: {
			permissions: [Permissions.RequestsRead],
		},
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
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) throw new LucidError(result.error);

			const count = result.data.output.acknowledged.length;
			return {
				output: result.data.output,
				changes: [{ type: "request", requestId: input.requestId }],
				summary: copy(
					count === 1
						? "admin:core.tools.requests_acknowledge.summary.one"
						: "admin:core.tools.requests_acknowledge.summary",
					{ data: { id: input.requestId, count } },
				),
			};
		},
	}).agent;
