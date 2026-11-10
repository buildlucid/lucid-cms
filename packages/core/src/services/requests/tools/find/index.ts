import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import {
	type CollectionToolOptions,
	getPermittedCollectionKeys,
	getScopedCollectionKeys,
} from "../../../../libs/permission/readable-collections.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import getMcpActor from "../../../../libs/tools/get-mcp-actor.js";
import { LucidError } from "../../../../utils/errors/index.js";
import findRequests from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const description =
	"Find requests for creating, publishing, unpublishing or deleting documents. Call it without a query to list every open request, most recently changed first, and add filters only to narrow that down. Read one with requests_get for its documents, comments and blockers.";

export const findRequestsMcpTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "requests_find",
		title: copy("admin:core.tools.requests_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [ExternalScopes.RequestsRead],
		},
		handler: async ({ context, input, execution }) => {
			const result = await findRequests(context, {
				input,
				actor: getMcpActor(execution.authority),
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

export const findRequestsAgentTool = (options: CollectionToolOptions = {}) =>
	defineTool({
		name: "requests_find",
		title: copy("admin:core.tools.requests_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [Permissions.RequestsRead],
			parallelSafe: true,
		},
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
			if (result.error) throw new LucidError(result.error);

			const count = result.data.output.pagination.count;
			return {
				output: result.data.output,
				summary: copy(
					count === 1
						? "admin:core.tools.requests_find.summary.one"
						: "admin:core.tools.requests_find.summary",
					{ data: { count } },
				),
			};
		},
	}).agent;
