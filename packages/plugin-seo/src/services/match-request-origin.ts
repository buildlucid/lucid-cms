import { getUrlHosts } from "@lucidcms/core/extension";
import type { SiteUrls } from "./resolve-site-urls.js";

/**
 * The configured site origin a request to the CMS's root files is for, matched by the request
 * URL's host as the site plugin matches a domain to its locale, since a TLS proxy in front of Lucid
 * can make the scheme `http` and leave the default port on the host. Any other host gets the
 * default locale's origin, so only configured values are ever used, never the request's own host.
 * A proxy that rewrites the Host header gets the default locale's files on every domain.
 */
const matchRequestOrigin = (siteUrls: SiteUrls, requestUrl: string) => {
	const { host } = new URL(requestUrl);
	return (
		[...siteUrls.origins].find((origin) =>
			getUrlHosts(origin).includes(host),
		) ?? siteUrls.url.origin
	);
};

export default matchRequestOrigin;
