import { copy } from "@lucidcms/core";
import { runToolkitService } from "@lucidcms/core/toolkit";
import type { ToolkitContext } from "@lucidcms/core/types";
import {
	sitemapFileReadInputSchema,
	sitemapReadInputSchema,
} from "../../schema/sitemap.js";
import type { SeoPluginOptionsInternal } from "../../services/parse-plugin-options.js";
import buildSitemapIndexXml from "../../services/sitemap/build-sitemap-index-xml.js";
import buildSitemapXml from "../../services/sitemap/build-sitemap-xml.js";
import findSitemapFile from "../../services/sitemap/find-sitemap-file.js";
import getSitemap from "../../services/sitemap/get-sitemap.js";
import type { SitemapFileReadInput, SitemapReadInput } from "../../types.js";

const errorCopy = {
	name: { key: "plugin.seo.toolkit.sitemap.error.name" },
	message: { key: "plugin.seo.toolkit.sitemap.error.message" },
};

/**
 * Sitemap reads for `toolkit.seo.sitemap`, which the content API and root routes also use. Each
 * read is for one site origin, the default locale's unless `origin` names another.
 */
const createSitemapToolkit = (
	context: ToolkitContext,
	options: SeoPluginOptionsInternal,
) => ({
	/**
	 * Lists every page in the sitemap, or one file's pages.
	 *
	 * @example
	 * ```ts
	 * const entries = await toolkit.seo.sitemap.entries({ environment: "production" });
	 * ```
	 */
	entries: (input: SitemapFileReadInput = {}) =>
		runToolkitService({
			schema: sitemapFileReadInputSchema,
			input,
			handler: async ({ file, ...read }) => {
				const sitemapRes = await getSitemap(context, { options, input: read });
				if (sitemapRes.error) return sitemapRes;
				if (file === undefined) {
					return {
						error: undefined,
						data: sitemapRes.data.flatMap((group) => group.entries),
					};
				}

				const groupRes = findSitemapFile(sitemapRes.data, file);
				if (groupRes.error) return groupRes;
				return { error: undefined, data: groupRes.data.entries };
			},
			...errorCopy,
		}),
	/** Lists the sitemap's files, as the index does, with how many pages each lists. */
	files: (input: SitemapReadInput = {}) =>
		runToolkitService({
			schema: sitemapReadInputSchema,
			input,
			handler: async (read) => {
				const sitemapRes = await getSitemap(context, { options, input: read });
				if (sitemapRes.error) return sitemapRes;
				return {
					error: undefined,
					data: sitemapRes.data.map((group) => group.file),
				};
			},
			...errorCopy,
		}),
	/**
	 * Writes the sitemap index, or one file when `file` is given, as XML. An origin without pages has
	 * no index, as one must list a file, so it is not found.
	 *
	 * @example
	 * ```ts
	 * const index = await toolkit.seo.sitemap.xml();
	 * const pages = await toolkit.seo.sitemap.xml({ file: "page" });
	 * const french = await toolkit.seo.sitemap.xml({ origin: "https://example.fr" });
	 * ```
	 */
	xml: (input: SitemapFileReadInput = {}) =>
		runToolkitService({
			schema: sitemapFileReadInputSchema,
			input,
			handler: async ({ file, ...read }) => {
				const sitemapRes = await getSitemap(context, { options, input: read });
				if (sitemapRes.error) return sitemapRes;
				if (file === undefined) {
					if (sitemapRes.data.length === 0) {
						return {
							error: {
								type: "basic",
								status: 404,
								message: copy("server:plugin.seo.sitemap.empty"),
							},
							data: undefined,
						};
					}
					return {
						error: undefined,
						data: buildSitemapIndexXml(
							sitemapRes.data.map((group) => group.file),
						),
					};
				}

				const groupRes = findSitemapFile(sitemapRes.data, file);
				if (groupRes.error) return groupRes;
				return {
					error: undefined,
					data: buildSitemapXml(groupRes.data.urls),
				};
			},
			...errorCopy,
		}),
});

export default createSitemapToolkit;
