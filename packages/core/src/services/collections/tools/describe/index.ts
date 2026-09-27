import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import describeCollection from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const describeCollectionMcpTool = defineMcpTool({
	name: "collections_describe",
	title: copy("admin:core.tools.collections_describe.title"),
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

export const describeCollectionAgentTool = defineAgentTool({
	name: "collections_describe",
	title: copy("admin:core.tools.collections_describe.title"),
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
