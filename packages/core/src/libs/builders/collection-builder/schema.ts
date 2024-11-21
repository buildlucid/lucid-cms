import z from "zod";

const CollectionConfigSchema = z.object({
	mode: z.enum(["single", "multiple"]),
	title: z.string(),
	singular: z.string(),
	description: z.string().optional(),
	isLocked: z.boolean().default(false).optional(),
	useTranslations: z.boolean().default(false).optional(),
	useDrafts: z.boolean().default(false).optional(),
	useRevisions: z.boolean().default(false).optional(),
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
