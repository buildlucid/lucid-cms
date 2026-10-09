import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { getPermittedCollectionKeys } from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentWriteToolOptions } from "../types.js";
import createDocument from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "documents_create" satisfies AgentLucidToolName;

export const createDocumentAgentTool = (
	options: DocumentWriteToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.documents_create.title"),
		description: options.direct
			? "Create a document in a collection. Use collections_describe first for its fields and bricks. It is saved straight away, unless the collection requires review, when it opens a create request for people to approve. To change a requested document before approval, call documents_update with the returned requestId."
			: "Create a document in a collection. Use collections_describe first for its fields and bricks. It opens a create request, and the document stays hidden until people approve it. To change it before then, call documents_update with the returned requestId.",
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiresApproval: options.direct ?? false,
		requiredPermissions: ({ collectionKey }) => [
			getCollectionPermission(collectionKey, "read"),
		],
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(createDocument, {
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
							? "admin:core.tools.documents_create.summary.requested"
							: "admin:core.tools.documents_create.summary",
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
