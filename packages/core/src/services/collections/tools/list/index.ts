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
			"List readable collections and their content structure summaries. routing.field stores the full public URL path, including parent segments. Use collections_describe for fields and publishing details.",
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
			"List readable collections and their content structure summaries. routing.field stores the full public URL path, including parent segments. Use collections_describe for fields and publishing details.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		handler: ({ context, input, execution }) =>
			listCollections(context, {
				input,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			}),
	});
