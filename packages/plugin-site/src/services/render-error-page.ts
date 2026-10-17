import type { LucidHonoContext } from "@lucidcms/core/types";
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

	const kiln = props.state.preview ? props.site.freshKiln : props.site.kiln;
	const html = await kiln.render(
		props.template,
		{ route: { path: props.state.path, params: {} } },
		{ state: props.state },
	);
	return props.hono.html(html, props.status);
};

export default renderErrorPage;
