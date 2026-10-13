import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import getOverview from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getRequestsOverviewAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineAgentTool({
		name: "requests_overview",
		title: copy("admin:core.tools.requests_overview.title"),
		description:
			"Count open requests by type and state, and how many documents in each collection's environments are behind latest or unpublished, as the review_overview screen shows. Use it to see what needs attention or is waiting to go live, then list the requests with requests_find or the documents with documents_find.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, execution }) => {
			const result = await getOverview(context, {
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy("admin:core.tools.requests_overview.summary"),
				},
			};
		},
	});
