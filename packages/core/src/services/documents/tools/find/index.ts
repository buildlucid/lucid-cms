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
import findDocuments from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findDocumentsMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "documents_find",
		title: copy("admin:core.tools.documents_find.title"),
		description:
			"Search a collection for documents matching field, brick, or repeater filters, including nested fields. Returns paginated summaries; read a document with documents_get for its bricks and before updating it.",
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
			findDocuments(context, {
				input,
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const findDocumentsAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "documents_find",
		title: copy("admin:core.tools.documents_find.title"),
		description:
			"Search a collection for documents matching field, brick, or repeater filters, including nested fields. Returns paginated summaries; read a document with documents_get for its bricks and before updating it.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await findDocuments(context, {
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
					summary: copy(
						result.data.output.data.length === 1
							? "admin:core.tools.documents_find.summary.one"
							: "admin:core.tools.documents_find.summary",
						{
							data: {
								count: result.data.output.data.length,
								collection:
									context.translate(labels?.plural) ?? input.collectionKey,
							},
						},
					),
				},
			};
		},
	});
