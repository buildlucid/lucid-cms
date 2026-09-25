import type z from "zod";
import collections from "../../../../libs/collection/collections.js";
import { collectionsFormatter } from "../../../../libs/formatters/index.js";
import { copy } from "../../../../libs/i18n/index.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import { fieldConfigSchema } from "../../../../schemas/collection-fields.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import type {
	entrySchema,
	fieldOwnerSchema,
	inputSchema,
	outputSchema,
} from "./schema.js";

type Entry = z.output<typeof entrySchema>;

/** Describes one readable collection, with large field trees split across pages. */
const describeCollection: ServiceFn<
	[{ input: z.output<typeof inputSchema>; allowedCollectionKeys: string[] }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const canRead = (key: string) => props.allowedCollectionKeys.includes(key);

	const readable = collectionsRes.data.filter((collection) =>
		canRead(collection.key),
	);
	const selected = readable.find(
		(collection) => collection.key === props.input.collectionKey,
	);
	if (!selected) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const formatted = collectionsFormatter.formatSingle({
		collection: selected,
		allCollections: readable,
		queueSupportsDelayedDelivery: context.queue.support.delayedDelivery,
		adminTranslations: context.translate.adminBundle(),
		localization: context.config.localization,
		include: { bricks: true, fields: true },
	});

	const entries: Entry[] = formatted.publishing.targets.map((target) => ({
		kind: "publishingTarget",
		key: target.key,
		label: context.translate(target.label) ?? target.key,
		requires: target.requires,
	}));

	const addFields = (
		fields: unknown[],
		owner: z.output<typeof fieldOwnerSchema>,
		brickKey: string | null,
		parentPath: string[] = [],
	) => {
		for (const field of fieldConfigSchema.array().parse(fields)) {
			const path = [...parentPath, field.key];
			const relationCollections = [field.collection ?? []]
				.flat()
				.filter(canRead);

			entries.push({
				kind: "field",
				owner,
				brickKey,
				path,
				fieldType: field.type,
				label: context.translate(field.details.label) ?? field.key,
				description: context.translate(field.details.description) ?? null,
				localized: field.localized === true,
				// Omit unset constraints; undefined values are not valid tool output.
				constraints: {
					...(field.validation?.required != null && {
						required: field.validation.required,
					}),
					...(field.min != null && { min: field.min }),
					...(field.max != null && { max: field.max }),
					...(field.step != null && { step: field.step }),
					...(field.validation?.minGroups != null && {
						minGroups: field.validation.minGroups,
					}),
					...(field.validation?.maxGroups != null && {
						maxGroups: field.validation.maxGroups,
					}),
					...(field.validation?.type != null && {
						mediaType: field.validation.type,
					}),
					...(field.validation?.extensions != null && {
						extensions: field.validation.extensions,
					}),
				},
				relationCollections,
				...(field.multiple != null && { multiple: field.multiple }),
				optionCount: field.options?.length ?? 0,
			});

			for (const option of field.options ?? []) {
				entries.push({
					kind: "option",
					owner,
					brickKey,
					fieldPath: path,
					value: option.value,
					label: context.translate(option.label) ?? option.value,
				});
			}
			if (Array.isArray(field.fields)) {
				addFields(field.fields, owner, brickKey, path);
			}
		}
	};

	addFields(formatted.fields, "document", null);
	for (const [brickType, bricks] of [
		["fixed", formatted.fixedBricks],
		["builder", formatted.builderBricks],
		["embedded", formatted.embeddedBricks],
	] as const) {
		for (const brick of bricks) {
			entries.push({
				kind: "brick",
				brickType,
				key: brick.key,
				label: context.translate(brick.details.label) ?? brick.key,
				description: context.translate(brick.details.description) ?? null,
			});
			addFields(brick.fields, brickType, brick.key);
		}
	}

	return {
		error: undefined,
		data: {
			output: {
				...paginate(entries, props.input.page, props.input.perPage),
				meta: {
					collection: {
						key: formatted.key,
						mode: formatted.mode,
						label:
							context.translate(formatted.details.labels.plural) ??
							formatted.key,
						description:
							context.translate(formatted.details.description ?? undefined) ??
							null,
						routing: formatted.routing
							? {
									field: formatted.routing.field,
									valueMeaning:
										"Complete public URL path, including parent segments, rather than just the final slug",
								}
							: null,
						localization: formatted.localized,
						publishing: { targetCount: formatted.publishing.targets.length },
					},
				},
			},
		},
	};
};

export default describeCollection;
