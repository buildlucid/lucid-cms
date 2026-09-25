import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import getDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getDocumentTool = defineTool({
	target: "mcp",
	name: "documents_get",
	description: "Read one document and its selected content fields and bricks.",
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
		getDocument(context, {
			input,
			allowedCollectionKeys: getScopedCollectionKeys(
				context.config,
				execution.authority.scopes,
			),
		}),
});

export const getDocumentAgentTool = defineTool({
	target: "agent",
	name: "documents_get",
	description: "Read one document and its selected content fields and bricks.",
	input: inputSchema,
	output: outputSchema,
	permissions: [],
	readOnly: true,
	requiredPermissions: ({ collectionKey }) => [
		getCollectionPermission(collectionKey, "read"),
	],
	handler: ({ context, input, execution }) =>
		getDocument(context, {
			input,
			allowedCollectionKeys: getPermittedCollectionKeys(
				context.config,
				execution.authority,
			),
		}),
});
