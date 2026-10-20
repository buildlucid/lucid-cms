import path from "node:path";
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
import writeStaticFile from "./write-static-file.js";

/** HTML pages are written as `index.html` in their path's folder; other files keep their path. */
const toFile = (routePath: string, contentType: string) =>
	contentType === HTML_CONTENT_TYPE
		? path.join(routePath, "index.html")
		: routePath;

const redirectPage = (location: string) => {
	const url = escapeHtml(location);
	return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${url}"><a href="${url}">${url}</a>`;
};

/** Renders a path into the build folder, returning whether it wrote a file and its root-relative HTML links; `redirect()` writes meta refresh, `notFound()` writes nothing, and other failures throw. */
const renderStaticPage = async (props: {
	site: Site;
	outDir: string;
	routePath: string;
	state: SiteState;
	warn: (message: string) => void;
}): Promise<{ written: boolean; links: string[] }> => {
	const { routePath } = props;
	const match = findRoute(props.site.router, "GET", routePath);
	if (!match) {
		props.warn(`Skipped ${routePath}, which no page routes to`);
		return { written: false, links: [] };
	}

	try {
		const body = await props.site.freshKiln.render(
			match.data.template,
			{ route: { path: routePath, params: getRouteParams(match) } },
			renderOptions(props.state),
		);
		await writeStaticFile(
			props.outDir,
			toFile(routePath, match.data.contentType),
			body,
		);
		return {
			written: true,
			links:
				match.data.contentType === HTML_CONTENT_TYPE ? findPageLinks(body) : [],
		};
	} catch (error) {
		const cause = error instanceof KilnRenderError ? error.cause : error;
		if (cause instanceof SiteNotFoundError) {
			props.warn(`Skipped ${routePath}, which called notFound()`);
			return { written: false, links: [] };
		}
		if (cause instanceof SiteRedirectError) {
			await writeStaticFile(
				props.outDir,
				toFile(routePath, HTML_CONTENT_TYPE),
				redirectPage(cause.location),
			);
			return { written: true, links: [] };
		}
		throw error;
	}
};

export default renderStaticPage;
