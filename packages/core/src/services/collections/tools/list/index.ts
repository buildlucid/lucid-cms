import { copy } from "../../../../libs/i18n/index.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import listCollections from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listCollectionsMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "collections_list",
		title: copy("admin:core.tools.collections_list.title"),
		description:
			"List accessible collections with summaries of their content structure and routing. Routing fields store the full public path, including parent segments.",
		input: inputSchema,
		output: outputSchema,
		scopes: [],
		annotations: { readOnlyHint: true },
		handler: ({ context, input, execution }) =>
			listCollections(context, {
				input,
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const listCollectionsAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "collections_list",
		title: copy("admin:core.tools.collections_list.title"),
		description:
			"List accessible collections with summaries of their content structure and routing. Routing fields store the full public path, including parent segments.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await listCollections(context, {
				input,
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
					...result.data,
					summary: copy(
						result.data.output.data.length === 1
							? "admin:core.tools.collections_list.summary.one"
							: "admin:core.tools.collections_list.summary",
						{
							data: { count: result.data.output.data.length },
						},
					),
				},
			};
		},
	});
