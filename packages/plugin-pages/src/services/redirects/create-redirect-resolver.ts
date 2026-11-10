import type { RedirectResolver } from "@lucidcms/core/types";
import type { RedirectsConfig } from "../../types/types.js";
import normalizeRedirectPath from "../../utils/normalize-redirect-path.js";
import findPageAtPath from "./find-page-at-path.js";
import findPathHistoryRedirect from "./find-path-history-redirect.js";
import findStoredRedirect from "./find-stored-redirect.js";

/**
 * Answers `toolkit.redirects.resolve()` for the pages plugin. A page using the path always wins,
 * then editors' redirects, then pages' old paths when they're tracked.
 */
const createRedirectResolver =
	(config: RedirectsConfig): RedirectResolver =>
	async (context, lookup) => {
		const path = normalizeRedirectPath(lookup.path);

		const pageRes = await findPageAtPath(context, {
			collections: config.collections,
			path,
			environment: lookup.environment,
			locale: lookup.locale,
		});
		if (pageRes.error) return pageRes;
		if (pageRes.data) return { error: undefined, data: null };

		const storedRes = await findStoredRedirect(context, {
			config,
			path,
			lookup,
		});
		if (storedRes.error || storedRes.data || !config.trackPathChanges) {
			return storedRes;
		}

		return findPathHistoryRedirect(context, { config, path, lookup });
	};

export default createRedirectResolver;
