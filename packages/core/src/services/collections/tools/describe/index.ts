import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
	limitCollections,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import describeCollection from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const describeCollectionMcpTool = (
	options: CollectionToolOptions = {},
) =>
	defineTool({
		name: "collections_describe",
		title: copy("admin:core.tools.collections_describe.title"),
		description:
			"Describe a collection's fields, bricks, routing, content languages, publishing options, and instructions for writing its content. Returns paginated details.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [],
			inputScopes: ({ input: { collectionKey } }) => [
				ExternalScopes.DocumentRead(collectionKey),
			],
			possibleScopes: ({ config }) =>
				limitCollections(config.collections, options.collections).map(
					(collection) => ExternalScopes.DocumentRead(collection.key),
				),
		},
		handler: async ({ context, input, execution }) => {
			const result = await describeCollection(context, {
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

export const describeCollectionAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineTool({
		name: "collections_describe",
		title: copy("admin:core.tools.collections_describe.title"),
		description:
			"Describe a collection's fields, bricks, routing, content languages, publishing options, and instructions for writing its content. Returns paginated details.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [],
			parallelSafe: true,
			inputPermissions: ({ input: { collectionKey } }) => [
				getCollectionPermission(collectionKey, "read"),
			],
		},
		handler: async ({ context, input, execution }) => {
			const result = await describeCollection(context, {
				input,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				reader: execution.authority,
			});
			if (result.error) throw new LucidError(result.error);

			return {
				...result.data,
				summary: copy("admin:core.tools.collections_describe.summary", {
					data: { collection: result.data.output.meta.collection.label },
				}),
			};
		},
	}).agent;
