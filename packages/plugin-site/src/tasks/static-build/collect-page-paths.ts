import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import evaluatePagePaths from "../../router/evaluate-page-paths.js";
import isDynamicPattern from "../../router/is-dynamic-pattern.js";
import type { Site } from "../../site/create-site-loader.js";
import type { SiteState } from "../../types.js";

/** Collects static pages followed by dynamic `paths` exports, rejecting missing exports and URLs that don't route back to their page. */
const collectPagePaths = async (props: {
	site: Site;
	state: SiteState;
	warn: (message: string) => void;
}): Promise<string[]> => {
	const { site } = props;
	const dynamic = site.pages.filter((page) => isDynamicPattern(page.pattern));
	const missing = dynamic.filter((page) => !page.paths);
	if (missing.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `These pages need a paths export so the build knows which of their pages to make: ${missing.map((page) => page.template).join(", ")}. Add one, such as {% export paths = documentPaths("page") %}.`,
		});
	}

	const listed = await evaluatePagePaths({
		site,
		pages: dynamic,
		state: props.state,
	});
	for (const { page, paths } of listed) {
		if (paths.length === 0) {
			props.warn(
				`'${page.template}' lists no paths, so the build makes none of its pages`,
			);
		}
	}

	const statics = site.pages
		.filter((page) => !isDynamicPattern(page.pattern))
		.map((page) => page.pattern);

	return [...new Set([...statics, ...listed.flatMap(({ paths }) => paths)])];
};

export default collectPagePaths;
