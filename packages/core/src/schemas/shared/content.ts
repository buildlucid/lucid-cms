import z from "zod";
import constants from "../../constants/constants.js";

/** The `locale` query parameter on content reads. */
export const contentLocaleSchema = z.string().trim().min(1).meta({
	description:
		"Reads translated fields, routes and media text in this locale. Collections without it use their default locale.",
	example: "en",
});

/** The `fallbackLocale` query parameter on content reads. */
export const contentFallbackLocaleSchema = z.string().trim().min(1).meta({
	description:
		"Reads this locale's value where the requested locale's translation is empty, such as the default locale.",
	example: "en",
});

/** The `depth` query parameter on content document reads. */
export const contentDepthSchema = z.coerce
	.number()
	.int()
	.min(0)
	.max(constants.query.depth.max)
	.meta({
		description: `How many levels of related documents to fill in with their route and fields. Defaults to ${constants.query.depth.default}; 0 leaves relations as their ID and collection.`,
		example: 1,
	});
