import type { LucidClient, LucidRequestOptions } from "@lucidcms/client/types";
import { robots, sitemap } from "./constants.js";
import type {
	RobotsReadInput,
	SitemapEntry,
	SitemapFile,
	SitemapFileReadInput,
	SitemapReadInput,
} from "./types.js";

export type {
	RobotsReadInput,
	SitemapAlternate,
	SitemapEntry,
	SitemapFile,
	SitemapFileReadInput,
	SitemapReadInput,
} from "./types.js";

type RequestInput = {
	/** Headers, an abort signal and retries for this call. */
	request?: LucidRequestOptions;
};

/**
 * Typed calls to the SEO plugin's content API routes, for sites that serve their own sitemap and
 * robots.txt, shaped like `toolkit.seo`. The API key needs the `sitemap:read` and `robots:read`
 * scopes for the calls it makes. Results follow the client's `{ error, data }` convention.
 *
 * @example
 * ```ts
 * import { createClient } from "@lucidcms/client";
 * import { createSeoClient } from "@lucidcms/seo/client";
 *
 * const client = createClient({
 * 	baseUrl: "https://cms.example.com",
 * 	auth: { type: "apiKey", apiKey: "<your-integration-key>" },
 * });
 * const seo = createSeoClient(client);
 * const entries = await seo.sitemap.entries({ environment: "production" });
 * const xml = await seo.sitemap.xml({ file: "page" });
 * const robotsTxt = await seo.robots.text({ origin: "https://example.fr" });
 * ```
 */
export const createSeoClient = (client: Pick<LucidClient, "routes">) => ({
	sitemap: {
		/** Every page in a site origin's sitemap, or one file's pages. */
		entries: ({
			request,
			...query
		}: SitemapFileReadInput & RequestInput = {}) =>
			client.routes.request<SitemapEntry[]>({
				path: `${sitemap.route}/entries`,
				query,
				request,
			}),
		/** A site origin's sitemap files, as its index lists them. */
		files: ({ request, ...query }: SitemapReadInput & RequestInput = {}) =>
			client.routes.request<SitemapFile[]>({
				path: `${sitemap.route}/files`,
				query,
				request,
			}),
		/** A site origin's sitemap index as XML, or one file when `file` is given. */
		xml: ({ request, ...query }: SitemapFileReadInput & RequestInput = {}) =>
			client.routes.request({
				path: `${sitemap.route}/xml`,
				query,
				request,
				responseType: "text",
			}),
	},
	robots: {
		/** A site origin's robots.txt. */
		text: ({ request, ...query }: RobotsReadInput & RequestInput = {}) =>
			client.routes.request({
				path: robots.route,
				query,
				request,
				responseType: "text",
			}),
	},
});
