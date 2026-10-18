import type { LucidHonoContext } from "@lucidcms/core/types";
import { pageMarkup } from "../engine/page-markup.js";
import type { SiteState } from "../types.js";
import type { Site } from "./create-site-loader.js";

const renderErrorPage = async (props: {
	hono: LucidHonoContext;
	site: Site;
	template: string;
	status: 404 | 500;
	state: SiteState;
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
		{ state },
	);
	return props.hono.html(html, props.status);
};

export default renderErrorPage;
