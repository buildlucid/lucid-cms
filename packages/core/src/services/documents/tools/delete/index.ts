import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { getPermittedCollectionKeys } from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentWriteToolOptions } from "../types.js";
import deleteDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "documents_delete" satisfies AgentLucidToolName;

export const deleteDocumentAgentTool = (
	options: DocumentWriteToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.documents_delete.title"),
		description: options.direct
			? "Delete a document by moving it to the bin, where people can restore it. Collections that require review open a delete request instead. Pass requestId to add it to an open delete request."
			: "Request deleting a document. It opens a delete request, and the document is only moved to the bin once people approve it. This chat's open delete request for the document is reused. Pass requestId to add it to another open delete request.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresApproval: options.direct ?? false,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(deleteDocument, {
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
							? "admin:core.tools.documents_delete.summary.requested"
							: "admin:core.tools.documents_delete.summary",
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
