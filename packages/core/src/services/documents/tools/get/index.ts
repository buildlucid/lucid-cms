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
import getDocument from "./handler.js";
import { agentInputSchema, inputSchema, outputSchema } from "./schema.js";

export const getDocumentMcpTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "documents_get",
		title: copy("admin:core.tools.documents_get.title"),
		description:
			"Read a document's selected content fields and bricks from a collection.",
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
			const result = await getDocument(context, {
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

export const getDocumentAgentTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "documents_get",
		title: copy("admin:core.tools.documents_get.title"),
		description:
			"Read a document's selected content fields and bricks from a collection, or its proposal in a request with version request:ID. Values use the shape documents_update accepts.",
		input: agentInputSchema,
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
			const result = await getDocument(context, {
				input,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				actor: execution.actor,
				reader: execution.authority,
			});
			if (result.error) throw new LucidError(result.error);

			const labels = context.config.collections.find(
				(collection) => collection.key === input.collectionKey,
			)?.getData.details.labels;

			return {
				...result.data,
				summary: copy("admin:core.tools.documents_get.summary", {
					data: {
						id: result.data.output.data.id,
						collection:
							context.translate(labels?.singular) ?? input.collectionKey,
					},
				}),
			};
		},
	}).agent;
