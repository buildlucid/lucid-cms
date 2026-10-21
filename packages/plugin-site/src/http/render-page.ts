import { logger } from "@lucidcms/core";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { streamIslands } from "@lucidkiln/core";
import type { MatchedRoute } from "rou3";
import { HTML_CONTENT_TYPE, PLUGIN_KEY } from "../constants.js";
import { pageMarkup } from "../preview/page-markup.js";
import getRouteParams from "../router/get-route-params.js";
import type { Site } from "../site/create-site-loader.js";
import renderOptions from "../site/render-options.js";
import type { SitePage, SiteState } from "../types.js";
import guardRenderStream from "./guard-render-stream.js";
import insertBeforeBodyEnd from "./insert-before-body-end.js";

const missedFooter = (state: SiteState) => {
	const markup = pageMarkup.get(state);
	if (!markup || markup.footerWritten || markup.footer === "") return "";

	logger.warn({
		scope: PLUGIN_KEY,
		event: "plugin-site.footer.missing",
		dedupeKey: `${PLUGIN_KEY}:footer-missing`,
		message: `${state.path} doesn't call footer(), so the Lucid toolbar was added before </body>. Call {{ footer() }} in your layout to place it yourself.`,
	});
	return markup.footer;
};

/** Early render failures reject before response headers are sent; later ones are logged by the stream guard. */
const renderPage = async (props: {
	hono: LucidHonoContext;
	site: Site;
	match: MatchedRoute<SitePage>;
	state: SiteState;
	cacheControl: string | undefined;
	development: boolean;
}) => {
	const kiln = props.state.preview ? props.site.freshKiln : props.site.kiln;
	const signal = props.hono.req.raw.signal;
	const stream = guardRenderStream(
		await kiln.renderStream(
			props.match.data.template,
			{
				route: { path: props.state.path, params: getRouteParams(props.match) },
			},
			{
				...renderOptions(props.state),
				islands: streamIslands(),
				signal,
			},
		),
		{
			path: props.state.path,
			development: props.development,
			data: props.site.data,
			signal,
		},
	);

	const isHtml = props.match.data.contentType === HTML_CONTENT_TYPE;
	return props.hono.body(
		isHtml
			? insertBeforeBodyEnd(stream, () => missedFooter(props.state))
			: stream,
		200,
		{
			"content-type": props.match.data.contentType,
			...(props.cacheControl ? { "cache-control": props.cacheControl } : {}),
		},
	);
};

export default renderPage;
