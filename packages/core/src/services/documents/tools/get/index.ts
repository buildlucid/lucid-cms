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
import getDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getDocumentMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "documents_get",
		title: copy("admin:core.tools.documents_get.title"),
		description:
			"Read one document and its selected content fields and bricks.",
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
			getDocument(context, {
				input,
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const getDocumentAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "documents_get",
		title: copy("admin:core.tools.documents_get.title"),
		description:
			"Read one document and its selected content fields and bricks.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await getDocument(context, {
				input,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) return result;

			const labels = context.config.collections.find(
				(collection) => collection.key === input.collectionKey,
			)?.getData.details.labels;

			return {
				error: undefined,
				data: {
					...result.data,
					summary: copy("admin:core.tools.documents_get.summary", {
						data: {
							id: result.data.output.data.id,
							collection:
								context.translate(labels?.singular) ?? input.collectionKey,
						},
					}),
				},
			};
		},
	});
