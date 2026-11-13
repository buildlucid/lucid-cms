import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import type { SiteConfig } from "../../site/create-site-config.js";

/** Fails a static build when `siteUrl` puts the site's locales on more than one domain, as it writes one folder without a request to choose a domain by. */
const assertOneDomain = (config: SiteConfig) => {
	if (config.domains.length === 1) return;

	throw new LucidError({
		scope: PLUGIN_KEY,
		message: `Static builds write one folder, but siteUrl puts the site's locales on more than one domain. A domain per language needs server rendering with mode "ssr" or "isr".`,
	});
};

export default assertOneDomain;
