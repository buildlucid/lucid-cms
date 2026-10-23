import { KilnRenderError } from "@lucidkiln/core";
import { findRoute } from "rou3";
import { HTML_CONTENT_TYPE } from "../../constants.js";
import { SiteNotFoundError, SiteRedirectError } from "../../errors.js";
import getRouteParams from "../../router/get-route-params.js";
import type { Site } from "../../site/create-site-loader.js";
import renderOptions from "../../site/render-options.js";
import type { SiteState } from "../../types.js";
import escapeHtml from "../../utils/escape-html.js";
import findPageLinks from "./find-page-links.js";

/** A file a static build writes, by its path within the output folder. */
export type StaticFile = { path: string; body: string };

/** HTML pages are written as `index.html` in their path's folder; other files keep their path. */
const toFile = (routePath: string, contentType: string) =>
	contentType === HTML_CONTENT_TYPE
		? `${routePath.replace(/\/+$/, "")}/index.html`
		: routePath;

const redirectPage = (location: string) => {
	const url = escapeHtml(location);
	return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${url}"><a href="${url}">${url}</a>`;
};

/** Renders a path to a file, returning its root-relative links or a skip reason; `redirect()` makes a meta refresh, `notFound()` makes nothing, and other failures throw. */
const renderStaticPage = async (props: {
	site: Site;
	routePath: string;
	state: SiteState;
}): Promise<
	| { written: true; file: StaticFile; links: string[] }
	| { written: false; reason: string }
> => {
	const { routePath } = props;
	const match = findRoute(props.site.router, "GET", routePath);
	if (!match) {
		return { written: false, reason: "no page routes to it" };
	}

	try {
		const isHtml = match.data.contentType === HTML_CONTENT_TYPE;
		const rendered = await props.site.freshKiln.render(
			match.data.template,
			{ route: { path: routePath, params: getRouteParams(match) } },
			renderOptions(props.state),
		);
		const body = isHtml ? props.site.finishPage(rendered) : rendered;

		return {
			written: true,
			file: { path: toFile(routePath, match.data.contentType), body },
			links: isHtml ? findPageLinks(body) : [],
		};
	} catch (error) {
		const cause = error instanceof KilnRenderError ? error.cause : error;

		if (cause instanceof SiteNotFoundError) {
			return { written: false, reason: "called notFound()" };
		}

		if (cause instanceof SiteRedirectError) {
			return {
				written: true,
				file: {
					path: toFile(routePath, HTML_CONTENT_TYPE),
					body: redirectPage(cause.location),
				},
				links: [],
			};
		}

		throw error;
	}
};

export default renderStaticPage;
