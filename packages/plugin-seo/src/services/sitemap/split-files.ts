import { copy } from "@lucidcms/core";
import type { ServiceResponse } from "@lucidcms/core/types";
import { sitemap } from "../../constants.js";
import type { SitemapEntry, SitemapFile } from "../../types.js";
import buildSitemapXml from "./build-sitemap-xml.js";
import buildUrlXml from "./build-url-xml.js";

/** A sitemap file, the pages it lists and their `<url>` elements, written once while sizing it. */
export type SitemapFileGroup = {
	file: SitemapFile;
	entries: SitemapEntry[];
	urls: string[];
};

/** How many pages, and how many bytes of XML, a sitemap file may hold. */
type SitemapFileLimits = { urls: number; bytes: number };

type FilePart = Pick<SitemapFileGroup, "entries" | "urls">;

const encoder = new TextEncoder();

/** A string's size once written as UTF-8. */
const byteLength = (value: string) => encoder.encode(value).byteLength;

/** The size of a file that lists no pages: the XML declaration and the `<urlset>` around them. */
const emptyBytes = byteLength(buildSitemapXml([]));

/** The newest ISO date, or null when there is none. Entry dates are all UTC ISO strings, so they sort as text. */
const newest = (entries: SitemapEntry[]) =>
	entries.reduce<string | null>(
		(latest, entry) =>
			entry.lastModified !== null &&
			(latest === null || entry.lastModified > latest)
				? entry.lastModified
				: latest,
		null,
	);

/** Splits one file's pages into parts that keep within both limits. A part always takes at least one page. */
const splitParts = (entries: SitemapEntry[], limits: SitemapFileLimits) => {
	const parts: FilePart[] = [];
	let part: FilePart = { entries: [], urls: [] };
	let bytes = emptyBytes;

	for (const entry of entries) {
		const url = buildUrlXml(entry);
		//* each page adds its element and the line break before it
		const size = byteLength(url) + 1;
		if (
			part.entries.length > 0 &&
			(part.entries.length >= limits.urls || bytes + size > limits.bytes)
		) {
			parts.push(part);
			part = { entries: [], urls: [] };
			bytes = emptyBytes;
		}
		part.entries.push(entry);
		part.urls.push(url);
		bytes += size;
	}
	if (part.entries.length > 0) parts.push(part);
	return parts;
};

/**
 * Groups entries by `file` in first-seen order, splitting at page-count or XML-size limits into
 * `name`, `name-2`, etc. Uses the requested site origin.
 */
const splitFiles = (
	entries: SitemapEntry[],
	origin: string,
	limits: SitemapFileLimits = sitemap.fileLimits,
): Awaited<ServiceResponse<SitemapFileGroup[]>> => {
	const byFile = Map.groupBy(entries, (entry) => entry.file);
	const groups: SitemapFileGroup[] = [];
	const names = new Set<string>();

	for (const [file, fileEntries] of byFile) {
		for (const [index, part] of splitParts(fileEntries, limits).entries()) {
			const name = index === 0 ? file : `${file}-${index + 1}`;
			if (names.has(name)) {
				return {
					error: {
						type: "basic",
						status: 500,
						message: copy("server:plugin.seo.sitemap.file.clash", {
							data: { file: name },
						}),
					},
					data: undefined,
				};
			}
			names.add(name);

			const path = `/sitemap-${name}.xml`;
			groups.push({
				file: {
					name,
					path,
					url: new URL(path, origin).href,
					count: part.entries.length,
					lastModified: newest(part.entries),
				},
				...part,
			});
		}
	}

	return { error: undefined, data: groups };
};

export default splitFiles;
