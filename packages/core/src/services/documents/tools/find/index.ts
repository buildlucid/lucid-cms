import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import findDocuments from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findDocumentsMcpTool = defineTool({
	target: "mcp",
	name: "documents_find",
	description:
		"Find documents in a collection by content filters. Supports nested custom-field, brick and repeater filters.",
	input: inputSchema,
	output: outputSchema,
	scopes: [],
	requiredScopes: ({ collectionKey }) => [
		ExternalScopes.DocumentRead(collectionKey),
	],
	advertisedScopes: (config) =>
		config.collections.map((collection) =>
			ExternalScopes.DocumentRead(collection.key),
		),
	annotations: { readOnlyHint: true },
	handler: ({ context, input, execution }) =>
		findDocuments(context, {
			input,
			allowedCollectionKeys: getScopedCollectionKeys(
				context.config,
				execution.authority.scopes,
			),
		}),
});

export const findDocumentsAgentTool = defineTool({
	target: "agent",
	name: "documents_find",
	description:
		"Find documents in a collection by content filters. Supports nested custom-field, brick and repeater filters.",
	input: inputSchema,
	output: outputSchema,
	permissions: [],
	readOnly: true,
	requiredPermissions: ({ collectionKey }) => [
		getCollectionPermission(collectionKey, "read"),
	],
	handler: ({ context, input, execution }) =>
		findDocuments(context, {
			input,
			allowedCollectionKeys: getPermittedCollectionKeys(
				context.config,
				execution.authority,
			),
		}),
});
