import collections from "../../../../libs/collection/collections.js";
import { collectionsFormatter } from "../../../../libs/formatters/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Lists only collections whose documents the caller can read. */
export const listCollectionsTool = defineTool({
	target: "mcp",
	name: "collections_list",
	description:
		"List readable collections and their content structure summaries. routing.field stores the full public URL path, including parent segments. Use collections_describe for fields and publishing details.",
	input: inputSchema,
	output: outputSchema,
	scopes: [],
	annotations: { readOnlyHint: true },
	handler: async ({ context, input, execution }) => {
		const collectionsRes = await collections.getAll(context, {});
		if (collectionsRes.error) return collectionsRes;

		const readable = collectionsRes.data.filter((collection) =>
			execution.authority.scopes.includes(
				ExternalScopes.DocumentRead(collection.key),
			),
		);
		const summaries = collectionsFormatter
			.formatMultiple({
				collections: readable,
				allCollections: readable,
				queueSupportsDelayedDelivery: context.queue.support.delayedDelivery,
				adminTranslations: context.translate.adminBundle(),
				localization: context.config.localization,
			})
			.map((collection) => ({
				key: collection.key,
				mode: collection.mode,
				label:
					context.translate(collection.details.labels.plural) ?? collection.key,
				description:
					context.translate(collection.details.description ?? undefined) ??
					null,
				routing: collection.routing,
				labelFields: collection.labelFields,
				localization: collection.localized,
				publishingTargetCount: collection.publishing.targets.length,
			}))
			.sort((a, b) => a.key.localeCompare(b.key));

		return {
			error: undefined,
			data: { output: paginate(summaries, input.page, input.perPage) },
		};
	},
});
