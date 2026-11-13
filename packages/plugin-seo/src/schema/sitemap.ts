import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";
import { sitemap } from "../constants.js";
import type {
	SitemapEntry,
	SitemapFile,
	SitemapFileReadInput,
	SitemapReadInput,
} from "../types.js";
import { originSchema } from "./origin.js";

const readInput = {
	origin: originSchema,
	environment: z.string().trim().min(1).optional().meta({
		description:
			"The environment to list published pages from, or latest. Defaults to the SEO plugin's sitemap environment",
		example: "production",
	}),
	trailingSlash: z.enum(["always", "never"]).optional().meta({
		description:
			"Adds or removes trailing slashes on every path and URL. Paths are left as stored when left out",
		example: "never",
	}),
};

/** Input for reads of the whole sitemap. */
export const sitemapReadInputSchema = z.object(
	readInput,
) satisfies z.ZodType<SitemapReadInput>;

/** Input for reads that can be narrowed to one file. */
export const sitemapFileReadInputSchema = z.object({
	...readInput,
	file: z.string().trim().regex(sitemap.fileName).optional().meta({
		description:
			"A file name from the files route, such as page or page-2. Leave out for every page, or the index",
		example: "page",
	}),
}) satisfies z.ZodType<SitemapFileReadInput>;

const sitemapEntrySchema = z.object({
	path: z
		.string()
		.meta({ description: "The path on the site", example: "/en/about" }),
	url: z.string().meta({
		description:
			"The absolute URL, built from the config's siteUrl for its locale",
		example: "https://example.com/en/about",
	}),
	locale: z.string().nullable().meta({
		description: "The locale of this language version, or null",
		example: "en",
	}),
	lastModified: z.string().nullable().meta({
		description: "When the listed version last changed, or null when unknown",
		example: "2026-11-12T09:30:00.000Z",
	}),
	alternates: z
		.array(z.object({ hreflang: z.string(), url: z.string() }))
		.meta({
			description:
				"Every listed language version of the page, itself included, and x-default",
		}),
	file: z.string().meta({
		description: "The sitemap file the page is listed in",
		example: "page",
	}),
}) satisfies z.ZodType<SitemapEntry>;

const sitemapFileSchema = z.object({
	name: z.string().meta({ description: "The file's name", example: "page" }),
	path: z.string().meta({
		description: "The file's path on the site",
		example: "/sitemap-page.xml",
	}),
	url: z.string().meta({
		description: "The file's absolute URL, on the origin the sitemap is for",
		example: "https://example.com/sitemap-page.xml",
	}),
	count: z
		.number()
		.meta({ description: "How many pages it lists", example: 12 }),
	lastModified: z.string().nullable().meta({
		description: "The newest lastModified of its pages, or null",
		example: "2026-11-12T09:30:00.000Z",
	}),
}) satisfies z.ZodType<SitemapFile>;

export const controllerSchemas = {
	entries: {
		body: undefined,
		params: undefined,
		query: sitemapFileReadInputSchema,
		response: z.array(sitemapEntrySchema),
	} satisfies RouteSchema,
	files: {
		body: undefined,
		params: undefined,
		query: sitemapReadInputSchema,
		response: z.array(sitemapFileSchema),
	} satisfies RouteSchema,
	xml: {
		body: undefined,
		params: undefined,
		query: sitemapFileReadInputSchema,
		response: undefined,
	} satisfies RouteSchema,
};
