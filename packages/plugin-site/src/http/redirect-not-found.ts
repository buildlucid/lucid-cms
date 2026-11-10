import { logger } from "@lucidcms/core";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { Site } from "../site/create-site-loader.js";
import type { SiteState } from "../types.js";
import carryQueryString from "./carry-query-string.js";

/**
 * Resolves missing-page redirects, preserving the query unless the target supplies one. Skips
 * previews and falls back to 404 on lookup failure.
 */
const redirectNotFound = async (props: {
	hono: LucidHonoContext;
	site: Site;
	state: SiteState;
}) => {
	if (props.state.preview) return null;

	const redirect = await props.state.toolkit.redirects.resolve({
		path: props.state.path,
		environment: props.site.config.environment,
		locale: props.state.locale,
	});
	if (redirect.error) {
		logger.error({
			scope: PLUGIN_KEY,
			event: "plugin-site.redirect.failed",
			message: `Failed to look up a redirect for ${props.state.path}`,
			error: redirect.error,
		});
		return null;
	}
	if (!redirect.data) return null;

	return props.hono.redirect(
		carryQueryString(
			redirect.data.location,
			new URL(props.hono.req.url).search,
		),
		redirect.data.status,
	);
};

export default redirectNotFound;
