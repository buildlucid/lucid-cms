import type z from "zod";
import collections from "../../../../libs/collection/collections.js";
import { collectionsFormatter } from "../../../../libs/formatters/index.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists only collections whose documents the caller can read. */
const listCollections: ServiceFn<
	[{ input: z.output<typeof inputSchema>; allowedCollectionKeys: string[] }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const readable = collectionsRes.data.filter((collection) =>
		props.allowedCollectionKeys.includes(collection.key),
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
				context.translate(collection.details.description ?? undefined) ?? null,
			routing: collection.routing,
			labelFields: collection.labelFields,
			localization: collection.localized,
			publishingTargetCount: collection.publishing.targets.length,
		}))
		.sort((a, b) => a.key.localeCompare(b.key));

	return {
		error: undefined,
		data: {
			output: paginate(summaries, props.input.page, props.input.perPage),
		},
	};
};

export default listCollections;
