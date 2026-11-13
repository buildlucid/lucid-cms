import { LucidError, z } from "@lucidcms/core";
import { indexNow, PLUGIN_KEY } from "../constants.js";
import type { SeoPluginOptions } from "../types.js";

const keySchema = z.string().trim().min(1);

/** A robots.txt value, which must fit on its line: a line break would start another, and `#` a comment. */
const robotsValue = z
	.string()
	.trim()
	.min(1, "Leave no robots.txt value empty.")
	.regex(/^[^\r\n#]*$/, "Use a value on one line, without '#'.");
const robotsPath = robotsValue.refine(
	(value) => value.startsWith("/") || value.startsWith("*"),
	"Start robots.txt paths with '/' or '*'.",
);
/** One value or a list of them, always read as a list. */
const oneOrMore = <T extends z.ZodType<string>>(schema: T) =>
	z
		.union([schema, z.array(schema)])
		.transform((value) => (Array.isArray(value) ? value : [value]));

const optionsSchema = z.strictObject({
	collections: z
		.array(
			z.strictObject({
				key: keySchema,
				localized: z.boolean().optional(),
				brickKey: keySchema.default("seo"),
			}),
		)
		.min(1),
	sitemap: z
		.union([
			z.literal(false),
			z.strictObject({
				collections: z.array(keySchema).min(1).optional(),
				environment: keySchema.optional(),
			}),
		])
		.default({}),
	robots: z
		.union([
			z.literal(false),
			z.strictObject({
				rules: z
					.array(
						z
							.strictObject({
								userAgent: oneOrMore(robotsValue).refine(
									(agents) => agents.length > 0,
									"Give at least one user agent.",
								),
								allow: oneOrMore(robotsPath).default([]),
								disallow: oneOrMore(robotsPath).default([]),
							})
							//* robots.txt has no group without a rule: its user agents would join the next group's
							.refine(
								(rule) => rule.allow.length > 0 || rule.disallow.length > 0,
								"Give each rule an allow or disallow path.",
							),
					)
					.optional(),
			}),
		])
		.default({}),
	indexNow: z
		.strictObject({
			key: z
				.string()
				.regex(indexNow.key, "Use 8 to 128 letters, numbers and hyphens."),
			deploy: keySchema.optional(),
			endpoint: z.url({ protocol: /^https?$/ }).default(indexNow.endpoint),
		})
		.optional(),
});

export type SeoPluginOptionsInternal = z.output<typeof optionsSchema>;
export type SeoIndexNowOptionsInternal = NonNullable<
	SeoPluginOptionsInternal["indexNow"]
>;

/** Checks the options when the plugin is created, before any collection is known. */
const parsePluginOptions = (
	given: SeoPluginOptions,
): SeoPluginOptionsInternal => {
	const parsed = optionsSchema.safeParse(given);
	if (!parsed.success) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Invalid SEO plugin options:\n${z.prettifyError(parsed.error)}`,
		});
	}

	const seen = new Set<string>();
	for (const target of parsed.data.collections) {
		if (seen.has(target.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `SEO collection '${target.key}' is configured more than once.`,
			});
		}
		seen.add(target.key);
	}

	const sitemap = parsed.data.sitemap;
	for (const key of sitemap === false ? [] : (sitemap.collections ?? [])) {
		if (!seen.has(key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Sitemap collection '${key}' isn't one of the SEO plugin's collections.`,
			});
		}
	}

	//* IndexNow sends the pages the sitemap lists
	if (sitemap === false && parsed.data.indexNow) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"IndexNow sends the pages the sitemap lists, so it needs the sitemap. Turn the sitemap on, or leave out indexNow.",
		});
	}

	return parsed.data;
};
export default parsePluginOptions;
