import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import describeCollection from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const describeCollectionMcpTool = defineTool({
	target: "mcp",
	name: "collections_describe",
	description:
		"Describe a collection's route, content locales, version targets, fields and bricks. Use page and perPage for remaining entries.",
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
		describeCollection(context, {
			input,
			allowedCollectionKeys: getScopedCollectionKeys(
				context.config,
				execution.authority.scopes,
			),
		}),
});

export const describeCollectionAgentTool = defineTool({
	target: "agent",
	name: "collections_describe",
	description:
		"Describe a collection's route, content locales, version targets, fields and bricks. Use page and perPage for remaining entries.",
	input: inputSchema,
	output: outputSchema,
	permissions: [],
	readOnly: true,
	requiredPermissions: ({ collectionKey }) => [
		getCollectionPermission(collectionKey, "read"),
	],
	handler: ({ context, input, execution }) =>
		describeCollection(context, {
			input,
			allowedCollectionKeys: getPermittedCollectionKeys(
				context.config,
				execution.authority,
			),
		}),
});
