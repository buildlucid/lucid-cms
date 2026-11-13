import { copy, z } from "@lucidcms/core";
import type { ServiceResponse } from "@lucidcms/core/types";
import { sitemap } from "../../constants.js";
import { buildPageUrl, toSitePath } from "../../shared/urls.js";
import type { SitemapEntry, SitemapEntryInput } from "../../types.js";
import type { SiteUrls } from "../resolve-site-urls.js";
import formatDate from "./format-date.js";

const urlSchema = z.url({ protocol: /^https?$/ });
const dateSchema = z
	.string()
	.refine((value) => formatDate(value) !== null, "Use an ISO date.");

const entrySchema = z.object({
	path: z.string().trim().min(1),
	url: urlSchema.optional(),
	locale: z.string().min(1).nullable().optional(),
	lastModified: dateSchema.nullable().optional(),
	alternates: z
		.array(z.object({ hreflang: z.string().trim().min(1), url: urlSchema }))
		.optional(),
	file: z
		.string()
		.regex(sitemap.fileName, "Use letters, numbers, hyphens and underscores.")
		.optional(),
});

/**
 * Validates hook entries and fills defaults, resolving paths against each locale's site URL. All
 * URLs, including alternates, must use a configured site origin.
 */
const completeEntries = (
	entries: ReadonlyArray<SitemapEntryInput>,
	siteUrls: SiteUrls,
): Awaited<ServiceResponse<SitemapEntry[]>> => {
	const parsed = entrySchema.array().safeParse(entries);
	if (!parsed.success) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.sitemap.entry.invalid", {
					data: { issue: z.prettifyError(parsed.error) },
				}),
			},
			data: undefined,
		};
	}

	const offsite = parsed.data
		.flatMap((entry) => [
			...(entry.url === undefined ? [] : [entry.url]),
			...(entry.alternates ?? []).map((alternate) => alternate.url),
		])
		.find((url) => !siteUrls.origins.has(new URL(url).origin));
	if (offsite !== undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.sitemap.entry.offsite", {
					data: { url: offsite, origins: [...siteUrls.origins].join(", ") },
				}),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: parsed.data.map((entry) => ({
			path: toSitePath(entry.path),
			url:
				entry.url ?? buildPageUrl(siteUrls.forLocale(entry.locale), entry.path),
			locale: entry.locale ?? null,
			lastModified: formatDate(entry.lastModified),
			alternates: entry.alternates ?? [],
			file: entry.file ?? sitemap.defaultFile,
		})),
	};
};

export default completeEntries;
