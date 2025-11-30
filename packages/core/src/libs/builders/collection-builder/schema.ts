import z from "zod/v4";
import constants from "../../../constants/constants.js";
import { stringTranslations } from "../../../schemas/locales.js";

const CollectionConfigSchema = z.object({
	key: z
		.string()
		.refine((val) => !val.includes(constants.db.collectionKeysJoin), {
			message: `Collection key cannot contain '${constants.db.collectionKeysJoin}'`,
		}),
	mode: z.enum(["single", "multiple"]),
	details: z.object({
		name: stringTranslations,
		singularName: stringTranslations,
		summary: stringTranslations.optional(),
	}),
	config: z
		.object({
			isLocked: z
				.boolean()
				.default(constants.collectionBuilder.isLocked)
				.optional(),
			useTranslations: z
				.boolean()
				.default(constants.collectionBuilder.useTranslations)
				.optional(),
			useRevisions: z
				.boolean()
				.default(constants.collectionBuilder.useRevisions)
				.optional(),
			useAutoSave: z
				.boolean()
				.default(constants.collectionBuilder.useAutoSave)
				.optional(),
			environments: z
				.array(
					z.object({
						key: z
							.string()
							.min(1)
							.max(50)
							.regex(/^[a-z0-9-_]+$/, {
								message:
									"Environment key must contain only lowercase letters, numbers, hyphens and underscores",
							})
							.refine(
								(val) =>
									!constants.collectionBuilder.protectedEnvironments.includes(
										val,
									),
								{
									message: `Environment key cannot be one of the protected environments: ${constants.collectionBuilder.protectedEnvironments.join(", ")}`,
								},
							),
						name: stringTranslations,
					}),
				)
				.optional(),
		})
		.optional(),
	hooks: z
		.array(
			z.object({
				event: z.string(),
				handler: z.unknown(),
			}),
		)
		.optional(),
	bricks: z
		.object({
			fixed: z.array(z.unknown()).optional(),
			builder: z.array(z.unknown()).optional(),
		})
		.optional(),
});

export default CollectionConfigSchema;
