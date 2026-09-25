import {
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import listCollections from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listCollectionsTool = defineTool({
	target: "mcp",
	name: "collections_list",
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
			),
		}),
});

export const listCollectionsAgentTool = defineTool({
	target: "agent",
	name: "collections_list",
	description:
		"List readable collections and their content structure summaries. routing.field stores the full public URL path, including parent segments. Use collections_describe for fields and publishing details.",
	input: inputSchema,
	output: outputSchema,
	permissions: [],
	readOnly: true,
	handler: ({ context, input, execution }) =>
		listCollections(context, {
			input,
			allowedCollectionKeys: getPermittedCollectionKeys(
				context.config,
				execution.authority,
			),
		}),
});
