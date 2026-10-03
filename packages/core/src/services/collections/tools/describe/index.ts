import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
	limitCollections,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import describeCollection from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const describeCollectionMcpTool = (
	options: CollectionToolOptions = {},
) =>
	defineMcpTool({
		name: "collections_describe",
		title: copy("admin:core.tools.collections_describe.title"),
		description:
			"Describe a collection's fields, bricks, routing, content languages, and publishing options. Returns paginated details.",
		input: inputSchema,
		output: outputSchema,
		scopes: [],
		requiredScopes: ({ collectionKey }) => [
			ExternalScopes.DocumentRead(collectionKey),
		],
		advertisedScopes: (config) =>
			limitCollections(config.collections, options.collections).map(
				(collection) => ExternalScopes.DocumentRead(collection.key),
			),
		annotations: { readOnlyHint: true },
		handler: ({ context, input, execution }) =>
			describeCollection(context, {
				input,
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const describeCollectionAgentTool = (
	options: CollectionToolOptions = {},
) =>
	defineAgentTool({
		name: "collections_describe",
		title: copy("admin:core.tools.collections_describe.title"),
		description:
			"Describe a collection's fields, bricks, routing, content languages, and publishing options. Returns paginated details.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await describeCollection(context, {
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
					summary: copy("admin:core.tools.collections_describe.summary", {
						data: { collection: result.data.output.meta.collection.label },
					}),
				},
			};
		},
	});
