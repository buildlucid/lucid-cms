import { logger } from "@lucidcms/core";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { KilnRenderError } from "@lucidkiln/core";
import { errorPages, PLUGIN_KEY } from "../constants.js";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import type { Site } from "../site/create-site-loader.js";
import type { SiteState } from "../types.js";
import createDevErrorPage from "./create-dev-error-page.js";
import renderErrorPage from "./render-error-page.js";

const respondToRenderError = async (props: {
	hono: LucidHonoContext;
	site: Site;
	state: SiteState;
	error: unknown;
	development: boolean;
}) => {
	const { hono, site, state, error } = props;
	const cause = error instanceof KilnRenderError ? error.cause : error;

	if (cause instanceof SiteRedirectError) {
		return hono.redirect(cause.location, cause.status);
	}
	if (cause instanceof SiteNotFoundError) {
		return renderErrorPage({
			hono,
			site,
			state,
			template: errorPages.notFound,
			status: 404,
		});
	}

	logger.error({
		scope: PLUGIN_KEY,
		event: "plugin-site.render.failed",
		message: `Failed to render ${state.path}`,
		error,
	});
	// Keeps CDNs from holding on to a failed render.
	hono.header("cache-control", "no-store");

	const page = await renderErrorPage({
		hono,
		site,
		state,
		template: errorPages.serverError,
		status: 500,
	});
	if (page) return page;
	if (props.development)
		return hono.html(createDevErrorPage({ error, data: site.data }), 500);
	throw error;
};

export default respondToRenderError;
