import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import getMcpActor from "../helpers/get-mcp-actor.js";
import findRequests from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const description =
	"Find review requests for creating, publishing, unpublishing or deleting documents. Call it without a query to list every open request, most recently changed first, and add filters only to narrow that down. Read one with requests_get for its documents, comments and blockers.";

export const findRequestsMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "requests_find",
		title: copy("admin:core.tools.requests_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.RequestsRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input, execution }) =>
			findRequests(context, {
				input,
				actor: getMcpActor(execution.authority),
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const findRequestsAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "requests_find",
		title: copy("admin:core.tools.requests_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await findRequests(context, {
				input,
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) return result;

			const count = result.data.output.meta.pagination.count;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.requests_find.summary.one"
							: "admin:core.tools.requests_find.summary",
						{ data: { count } },
					),
				},
			};
		},
	});
