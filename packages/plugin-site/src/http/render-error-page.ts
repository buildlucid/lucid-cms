import type { LucidHonoContext } from "@lucidcms/core/types";
import { pageMarkup } from "../preview/page-markup.js";
import type { Site } from "../site/create-site-loader.js";
import renderOptions from "../site/render-options.js";
import type { SiteState } from "../types.js";

const renderErrorPage = async (props: {
	hono: LucidHonoContext;
	site: Site;
	template: string;
	status: 404 | 500;
	state: SiteState;
	/** Sent with the page when given, such as the site's default for 404s. */
	cacheControl?: string;
}) => {
	if (!props.site.templates.has(props.template)) return undefined;

	// The failed render's output is discarded, so the error page must write footer() again.
	const state: SiteState = { ...props.state };
	const markup = pageMarkup.get(props.state);
	if (markup) pageMarkup.set(state, { ...markup, footerWritten: false });

	const kiln = state.preview ? props.site.freshKiln : props.site.kiln;
	const html = await kiln.render(
		props.template,
		{ route: { path: state.path, params: {} } },
		renderOptions(state),
	);
	return props.hono.html(
		html,
		props.status,
		props.cacheControl ? { "cache-control": props.cacheControl } : undefined,
	);
};

export default renderErrorPage;
