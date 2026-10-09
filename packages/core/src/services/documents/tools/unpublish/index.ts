import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { getPermittedCollectionKeys } from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentWriteToolOptions } from "../types.js";
import unpublishDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "documents_unpublish" satisfies AgentLucidToolName;

export const unpublishDocumentAgentTool = (
	options: DocumentWriteToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.documents_unpublish.title"),
		description: options.direct
			? "Unpublish a document from a publishing target, eg. production. Targets that require review open an unpublish request instead. Pass requestId to add it to an open unpublish request."
			: "Request unpublishing a document from a publishing target, eg. production. It opens an unpublish request, and the document stays published until people approve it. This chat's open unpublish request for the document is reused. Pass requestId to add it to another open unpublish request.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresApproval: options.direct ?? false,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(unpublishDocument, {
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
							? "admin:core.tools.documents_unpublish.summary.requested"
							: "admin:core.tools.documents_unpublish.summary",
						{
							data: {
								id: output.document.id,
								target: input.target,
								collection:
									context.translate(labels?.singular) ?? input.collectionKey,
							},
						},
					),
				},
			};
		},
	});
