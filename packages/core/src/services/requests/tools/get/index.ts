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
import getMcpActor from "../../../../libs/tools/get-mcp-actor.js";
import { LucidError } from "../../../../utils/errors/index.js";
import getRequest from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getRequestMcpTool = (options: CollectionToolOptions = {}) =>
	defineMcpTool({
		name: "requests_get",
		title: copy("admin:core.tools.requests_get.title"),
		description:
			"Read a request: its documents and targets, approvals, blockers and comment threads.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.RequestsRead],
		annotations: { readOnlyHint: true },
		handler: async ({ context, input, execution }) => {
			const result = await getRequest(context, {
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
	});

export const getRequestAgentTool = (options: CollectionToolOptions = {}) =>
	defineAgentTool({
		name: "requests_get",
		title: copy("admin:core.tools.requests_get.title"),
		description:
			"Read a request: its documents and targets, approvals, blockers, comment threads and what you can do. To review a proposal, read it with documents_get and version request:ID, and compare it with the target version. To request changes, comment with requests_comment. Change your own comments, marked byYou, with requests_update_comment.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.RequestsRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await getRequest(context, {
				input,
				actor: execution.actor,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
				agentKey: execution.run.agentKey,
			});
			if (result.error) throw new LucidError(result.error);

			return {
				output: result.data.output,
				summary: copy("admin:core.tools.requests_get.summary", {
					data: { id: input.requestId },
				}),
			};
		},
	});
