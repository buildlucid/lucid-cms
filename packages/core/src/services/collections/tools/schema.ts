import z from "zod";

export const collectionLocalizationSchema = z
	.union([
		z.literal(false),
		z.object({
			locales: z.array(z.string()),
			defaultLocale: z.string(),
		}),
	])
	.meta({
		description: "Supported content languages, or false when unlocalized.",
	});
