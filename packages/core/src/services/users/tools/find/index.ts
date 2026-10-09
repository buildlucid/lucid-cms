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
import getMcpActor from "../../../requests/tools/helpers/get-mcp-actor.js";
import findUsers from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const description =
	"Find people who use the CMS, eg. to fill a user field, mention someone in a comment or choose who reviews a request. Call it without a query to list everyone, and search by name to narrow that down. Before changing a request's reviewers, find who can approve it with canReview.";

export const findUsersMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "users_find",
		title: copy("admin:core.tools.users_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.UsersList],
		requiredScopes: ({ query }) =>
			query.canReview === undefined ? [] : [ExternalScopes.RequestsRead],
		advertisedScopes: () => [ExternalScopes.RequestsRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input, execution }) =>
			findUsers(context, {
				input,
				actor: getMcpActor(execution.authority),
				showStatus: execution.authority.principal.type === "user",
				allowedCollectionKeys: getScopedCollectionKeys(
					context.config,
					execution.authority.scopes,
					options.collections,
				),
			}),
	});

export const findUsersAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "users_find",
		title: copy("admin:core.tools.users_find.title"),
		description,
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiredPermissions: ({ query }) =>
			query.canReview === undefined ? [] : [Permissions.RequestsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await findUsers(context, {
				input,
				actor: execution.actor,
				showStatus: true,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) return result;

			const count = result.data.output.pagination.count;
			return {
				error: undefined,
				data: {
					output: result.data.output,
					summary: copy(
						count === 1
							? "admin:core.tools.users_find.summary.one"
							: "admin:core.tools.users_find.summary",
						{ data: { count } },
					),
				},
			};
		},
	});
