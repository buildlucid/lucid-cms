import { copy } from "@lucidcms/core";
import type { ServiceResponse } from "@lucidcms/core/types";
import type { SiteUrls } from "./resolve-site-urls.js";

/**
 * The site origin a sitemap or robots.txt read is for: the requested one when it is among the
 * configured site URLs' origins, else a 400 naming them. The default locale's when none is given.
 */
const resolveSiteOrigin = (
	siteUrls: SiteUrls,
	requested: string | undefined,
): Awaited<ServiceResponse<string>> => {
	if (requested === undefined) {
		return { error: undefined, data: siteUrls.url.origin };
	}

	const origin = URL.canParse(requested) ? new URL(requested).origin : null;
	if (origin !== null && siteUrls.origins.has(origin)) {
		return { error: undefined, data: origin };
	}

	return {
		error: {
			type: "basic",
			status: 400,
			message: copy("server:plugin.seo.origin.unknown", {
				data: { origin: requested, origins: [...siteUrls.origins].join(", ") },
			}),
		},
		data: undefined,
	};
};

export default resolveSiteOrigin;
