import { copy } from "@lucidcms/core";
import { reservedPaths } from "@lucidcms/core/extension";
import type { ServiceFn } from "@lucidcms/core/types";
import { sitemap } from "../../constants.js";
import type { RobotsReadInput } from "../../types.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import resolveSiteOrigin from "../resolve-site-origin.js";
import resolveSiteUrls from "../resolve-site-urls.js";
import buildRobotsText, { type RobotsGroup } from "./build-robots-text.js";

/**
 * Lets every crawler in, except, on the CMS's own origin, into the admin: `/admin` with or without
 * a query string, such as `/admin?next=/`, and paths under it, but not a site page such as
 * `/administration`, as only that segment is Lucid's. Nothing else is blocked: `/cdn` media should
 * reach image search, built assets render pages, and `/api` and `/mcp` already send
 * `X-Robots-Tag: noindex`, which a blocked crawler couldn't read.
 */
const defaultGroups = (isCmsOrigin: boolean): RobotsGroup[] => [
	{
		userAgent: ["*"],
		allow: ["/"],
		disallow: isCmsOrigin
			? [
					`${reservedPaths.admin}$`,
					`${reservedPaths.admin}?`,
					`${reservedPaths.admin}/`,
				]
			: [],
	},
];

/**
 * Writes one site origin's robots.txt: the configured rules or the default, then a `Sitemap:` line
 * for that origin's sitemap index while the sitemap is on, even before the origin has pages, as
 * checking would build the sitemap on every request. Pages set to `noindex` are never disallowed,
 * as a crawler kept out never sees the tag.
 */
const getRobots: ServiceFn<
	[{ options: SeoPluginOptionsInternal; input: RobotsReadInput }],
	string
> = async (context, data) => {
	const { options, input } = data;
	if (options.robots === false) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:plugin.seo.robots.disabled"),
			},
			data: undefined,
		};
	}

	const siteUrls = resolveSiteUrls(context.config);
	if (!siteUrls) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.robots.site.url.missing"),
			},
			data: undefined,
		};
	}
	const originRes = resolveSiteOrigin(siteUrls, input.origin);
	if (originRes.error) return originRes;
	const origin = originRes.data;

	return {
		error: undefined,
		data: buildRobotsText({
			groups:
				options.robots.rules ??
				defaultGroups(origin === new URL(context.config.url).origin),
			sitemapUrl:
				options.sitemap === false
					? null
					: new URL(sitemap.indexPath, origin).href,
		}),
	};
};

export default getRobots;
