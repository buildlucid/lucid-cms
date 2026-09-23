import type { CollectionBuilder } from "@lucidcms/core";
import { LucidError, z } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SeoPluginOptions } from "../types.js";

const optionsSchema = z.strictObject({
	siteUrl: z.url({ protocol: /^https?$/ }).optional(),
	collections: z
		.array(
			z.strictObject({
				key: z.string().trim().min(1),
				localized: z.boolean().optional(),
				brickKey: z.string().trim().min(1).default("seo"),
			}),
		)
		.min(1),
});

/** Resolve and check every target before mutating the configuration. */
const resolvePluginOptions = (
	given: SeoPluginOptions,
	collections: CollectionBuilder[],
) => {
	const parsed = optionsSchema.safeParse(given);
	if (!parsed.success) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Invalid SEO plugin options: ${parsed.error.message}`,
		});
	}

	const seen = new Set<string>();
	return parsed.data.collections.map((target) => {
		if (seen.has(target.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `SEO collection '${target.key}' is configured more than once.`,
			});
		}
		seen.add(target.key);

		const collection = collections.find((item) => item.key === target.key);
		if (!collection) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `SEO collection '${target.key}' was not found.`,
			});
		}

		if (
			collection.brickInstances.some((brick) => brick.key === target.brickKey)
		) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Brick '${target.brickKey}' already exists on '${target.key}'. Remove it or choose another SEO brickKey.`,
			});
		}

		return {
			collection,
			brickKey: target.brickKey,
			localized:
				target.localized ??
				(collection.config.localized !== false &&
					collection.config.localized !== undefined),
		};
	});
};
export default resolvePluginOptions;
