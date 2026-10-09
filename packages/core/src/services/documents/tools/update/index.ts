import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { getPermittedCollectionKeys } from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentWriteToolOptions } from "../types.js";
import updateDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "documents_update" satisfies AgentLucidToolName;

export const updateDocumentAgentTool = (
	options: DocumentWriteToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.documents_update.title"),
		description: options.direct
			? "Update a document's fields and bricks, sending only what changes. Read it with documents_get first and reuse its refs. Changes are saved to latest. Pass requestId to change a request's proposal instead, eg. a document waiting in a create request."
			: "Update a document's fields and bricks, sending only what changes. Read it with documents_get first and reuse its refs. Changes are proposed in a request for people to review and approve, and this chat's open request for the document is reused. Pass requestId to change a specific request, eg. a document waiting in a create request.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresApproval: options.direct ?? false,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(updateDocument, {
				transaction: true,
			})(context, {
				input,
				actor: execution.actor,
				conversationId: execution.run.conversationId,
				toolName: name,
				direct: options.direct ?? false,
				allowedCollectionKeys: getPermittedCollectionKeys(
					context.config,
					execution.authority,
					options.collections,
				),
			});
			if (result.error) return result;

			const { output } = result.data;
			const labels = context.config.collections.find(
				(collection) => collection.key === input.collectionKey,
			)?.getData.details.labels;

			return {
				error: undefined,
				data: {
					output,
					summary: copy(
						output.outcome === "requested"
							? "admin:core.tools.documents_update.summary.requested"
							: "admin:core.tools.documents_update.summary",
						{
							data: {
								id: output.document.id,
								collection:
									context.translate(labels?.singular) ?? input.collectionKey,
							},
						},
					),
				},
			};
		},
	});
