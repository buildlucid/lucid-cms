import { LucidError } from "@lucidcms/core";
import { findRoute } from "rou3";
import { PLUGIN_KEY } from "../../constants.js";
import fillPagePattern from "../../router/fill-page-pattern.js";
import getRouteParams from "../../router/get-route-params.js";
import isDynamicPattern from "../../router/is-dynamic-pattern.js";
import type { Site } from "../../site/create-site-loader.js";
import renderOptions from "../../site/render-options.js";
import type { SitePage, SiteState } from "../../types.js";
import isRecord from "../../utils/is-record.js";
import normalizePath from "../../utils/normalize-path.js";

const MAX_PROBLEMS = 20;

/** One entry of a page's `paths` export as a URL that routes back to that page with the same values. */
const toPagePath = (
	site: Site,
	page: SitePage,
	entry: unknown,
): { error: string; data: undefined } | { error: undefined; data: string } => {
	let routePath: string;
	if (typeof entry === "string") {
		if (!entry.startsWith("/")) {
			return {
				error: `'${page.template}' lists '${entry}', which doesn't start with '/'`,
				data: undefined,
			};
		}
		routePath = normalizePath(entry);
	} else if (isRecord(entry)) {
		const filled = fillPagePattern(page.pattern, entry);
		if (filled.error !== undefined) {
			return { error: `'${page.template}' ${filled.error}`, data: undefined };
		}
		routePath = filled.data;
	} else {
		return {
			error: `'${page.template}' lists a ${typeof entry}, not a URL or a hash of values`,
			data: undefined,
		};
	}

	const match = findRoute(site.router, "GET", routePath);
	if (match?.data.template !== page.template) {
		return {
			error: `'${page.template}' lists '${routePath}', which ${match ? `'${match.data.template}'` : "no page"} renders`,
			data: undefined,
		};
	}
	if (isRecord(entry)) {
		const params = getRouteParams(match);
		const changed = Object.keys(entry).find(
			(name) => String(entry[name] ?? "") !== (params[name] ?? ""),
		);
		if (changed) {
			return {
				error: `'${page.template}' gives '${changed}' as '${entry[changed]}', but '${routePath}' routes back with '${params[changed] ?? ""}'`,
				data: undefined,
			};
		}
	}
	return { error: undefined, data: routePath };
};

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

	const problems: string[] = [];
	const listed = await Promise.all(
		dynamic.map(async (page) => {
			const entries = await site.freshKiln.evaluate(
				page.template,
				"paths",
				renderOptions(props.state),
			);
			if (!Array.isArray(entries)) {
				problems.push(
					`'${page.template}' exports paths as something other than a list`,
				);
				return [];
			}
			if (entries.length === 0) {
				props.warn(
					`'${page.template}' lists no paths, so the build makes none of its pages`,
				);
			}
			return entries.flatMap((entry) => {
				const result = toPagePath(site, page, entry);
				if (result.error !== undefined) {
					problems.push(result.error);
					return [];
				}
				return [result.data];
			});
		}),
	);

	if (problems.length > 0) {
		const more = problems.length - MAX_PROBLEMS;
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Some paths don't fit their pages:\n${problems.slice(0, MAX_PROBLEMS).join("\n")}${more > 0 ? `\n…and ${more} more` : ""}`,
		});
	}

	const statics = site.pages
		.filter((page) => !isDynamicPattern(page.pattern))
		.map((page) => page.pattern);
	return [...new Set([...statics, ...listed.flat()])];
};

export default collectPagePaths;
