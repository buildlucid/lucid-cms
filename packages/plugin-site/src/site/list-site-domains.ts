import { getSiteUrl, getUrlHosts } from "@lucidcms/core/extension";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";

/** Site locales whose site URLs are on one host: the locales a request for that host can render. */
export type SiteDomain = {
	/** Every `Host` a request for it can carry, as `getUrlHosts` lists them; none without a site URL. */
	hosts: string[];
	/** Its locales in the order given. */
	locales: [string, ...string[]];
};

/**
 * Groups locales by the host of their site URL, in the order given, so the first locale's domain
 * comes first. A `siteUrl` string, or a record whose URLs share a host, puts every locale on one.
 */
const listSiteDomains = (
	config: ResolvedLucidConfig,
	[first, ...others]: readonly [string, ...string[]],
): [SiteDomain, ...SiteDomain[]] => {
	const hostsOf = (code: string) => {
		const url = getSiteUrl(config, code);
		return url === null ? [] : getUrlHosts(url);
	};

	const domains: [SiteDomain, ...SiteDomain[]] = [
		{ hosts: hostsOf(first), locales: [first] },
	];
	for (const code of others) {
		const hosts = hostsOf(code);
		// A URL's own host comes first, and locales without a site URL have none, so they share one.
		const domain = domains.find((item) => item.hosts[0] === hosts[0]);
		if (domain) {
			domain.locales.push(code);
			// Locales on one host can differ in scheme, so each adds the hosts its own URL answers to.
			domain.hosts = [...new Set([...domain.hosts, ...hosts])];
		} else {
			domains.push({ hosts, locales: [code] });
		}
	}
	return domains;
};

export default listSiteDomains;
