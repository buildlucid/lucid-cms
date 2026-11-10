import { copy } from "../../../../libs/i18n/index.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import listCollections from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listCollectionsMcpTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "collections_list",
		title: copy("admin:core.tools.collections_list.title"),
		description:
			"List accessible collections with summaries of their content structure and routing. Routing fields store the full public path, including parent segments.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [],
		},
		handler: async ({ context, input, execution }) => {
			const result = await listCollections(context, {
				input,
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			});
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).mcp;

export const listCollectionsAgentTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "collections_list",
		title: copy("admin:core.tools.collections_list.title"),
		description:
			"List accessible collections with summaries of their content structure and routing. Routing fields store the full public path, including parent segments.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [],
			parallelSafe: true,
		},
		handler: async ({ context, input, execution }) => {
			const result = await listCollections(context, {
				input,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) throw new LucidError(result.error);

			return {
				...result.data,
				summary: copy(
					result.data.output.data.length === 1
						? "admin:core.tools.collections_list.summary.one"
						: "admin:core.tools.collections_list.summary",
					{
						data: { count: result.data.output.data.length },
					},
				),
			};
		},
	}).agent;
