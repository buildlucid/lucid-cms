import { isAiFeatureEnabled } from "../../../../libs/config/ai-features.js";
import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { getPermittedCollectionKeys } from "../../../../libs/permission/readable-collections.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentResource } from "../../../../types/response.js";
import dedent from "../../../../utils/helpers/dedent.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentWriteToolOptions } from "../types.js";
import translateDocumentsTool from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "documents_translate";

export const translateDocumentAgentTool = (
	options: DocumentWriteToolOptions = {},
) =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.documents_translate.title"),
		description: dedent(`
			Translate documents' localized text from the collection's default locale with Lucid AI. ${
				options.direct
					? "Translations are saved to latest. Pass requestId to translate an open request's proposals instead."
					: "Opens one request per locale for people to review, or pass requestId to translate an open request's proposals, eg. one a person asked you to translate."
			} Use it for any translation instead of writing translations with documents_update or the builder tools.
			By default only missing and out-of-date machine translations are made, and translations people wrote are left alone. Set overwrite only when the person asks to replace those too. documents_get with translations shows what each language needs first.
			Uses Lucid credits.
		`),
		input: inputSchema,
		output: outputSchema,
		permissions: options.direct
			? [Permissions.AiTranslate]
			: [Permissions.AiTranslate, Permissions.RequestsRead],
		available: ({ config, aiAccess }) =>
			isAiFeatureEnabled(config, "translation", aiAccess),
		//* requests already receive review, so only saving to latest needs confirmation
		requiresConfirmation: options.direct
			? ({ input }) => input.requestId === undefined
			: false,
		inputPermissions: ({ input: { collectionKey } }) => [
			getCollectionPermission(collectionKey, "read"),
			getCollectionPermission(collectionKey, "update"),
		],
		//* translating calls Lucid AI for a while, so requests open in their own transactions
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(translateDocumentsTool, {
				transaction: false,
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
			const requestIds = [
				...new Set(output.requests.map((request) => request.id)),
			];
			const changes: AgentResource[] = [
				...requestIds.map((requestId) => ({
					type: "request" as const,
					requestId,
				})),
				...output.documents.map((document) => ({
					type: "document" as const,
					collectionKey: input.collectionKey,
					documentId: document.id,
				})),
			];
			const count =
				output.outcome === "applied"
					? output.documents.length
					: requestIds.length;
			return {
				error: undefined,
				data: {
					output,
					changes,
					summary: copy(
						count === 0
							? "admin:core.tools.documents_translate.summary.none"
							: output.outcome === "applied"
								? "admin:core.tools.documents_translate.summary.applied"
								: count === 1
									? "admin:core.tools.documents_translate.summary.one"
									: "admin:core.tools.documents_translate.summary",
						{ data: { count } },
					),
				},
			};
		},
	});
