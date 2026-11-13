import { findRoute, type RouterContext } from "rou3";
import { HTML_CONTENT_TYPE } from "../constants.js";
import type { SitePage, SiteTrailingSlash } from "../types.js";
import applyTrailingSlash from "../utils/apply-trailing-slash.js";

/**
 * The path an HTML page request should redirect to, or null when it's already canonical: repeated slashes collapsed and the
 * trailing slash as the `trailingSlash` option says. The root and pages with another content type keep whatever they were asked for.
 */
const findCanonicalPath = (props: {
	/** The request's pathname, still percent-encoded so the redirect keeps it as sent. */
	pathname: string;
	router: RouterContext<SitePage>;
	trailingSlash: SiteTrailingSlash;
}): string | null => {
	const canonical = applyTrailingSlash(props.pathname, props.trailingSlash);
	if (canonical === props.pathname) return null;

	const match = findRoute(props.router, "GET", canonical);
	if (!match || match.data.contentType !== HTML_CONTENT_TYPE) return null;
	return canonical;
};

export default findCanonicalPath;
