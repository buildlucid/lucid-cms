import { LucidError } from "@lucidcms/core";
import { findRoute } from "rou3";
import { PLUGIN_KEY } from "../constants.js";
import fillPagePattern from "../router/fill-page-pattern.js";
import isDynamicPattern from "../router/is-dynamic-pattern.js";
import type { Site } from "../services/create-site-loader.js";
import type { SitePage, SiteState } from "../types.js";
import getRouteParams from "../utils/get-route-params.js";
import isRecord from "../utils/is-record.js";
import normalizePath from "../utils/normalize-path.js";

const MAX_PROBLEMS = 20;

/** One entry of a page's `paths` export as a URL that routes back to that page with the same values. */
const toPagePath = (site: Site, page: SitePage, entry: unknown): string => {
	let routePath: string;
	if (typeof entry === "string") {
		if (!entry.startsWith("/")) {
			throw new Error(`lists '${entry}', which doesn't start with '/'`);
		}
		routePath = normalizePath(entry);
	} else if (isRecord(entry)) {
		routePath = fillPagePattern(page.pattern, entry);
	} else {
		throw new Error(`lists a ${typeof entry}, not a URL or a hash of values`);
	}

	const match = findRoute(site.router, "GET", routePath);
	if (match?.data.template !== page.template) {
		throw new Error(
			`lists '${routePath}', which ${match ? `'${match.data.template}'` : "no page"} renders`,
		);
	}
	if (isRecord(entry)) {
		const params = getRouteParams(match);
		const changed = Object.keys(entry).find(
			(name) => String(entry[name] ?? "") !== (params[name] ?? ""),
		);
		if (changed) {
			throw new Error(
				`gives '${changed}' as '${entry[changed]}', but '${routePath}' routes back with '${params[changed] ?? ""}'`,
			);
		}
	}
	return routePath;
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
			const entries = await site.freshKiln.evaluate(page.template, "paths", {
				state: props.state,
			});
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
				try {
					return [toPagePath(site, page, entry)];
				} catch (error) {
					problems.push(
						`'${page.template}' ${error instanceof Error ? error.message : String(error)}`,
					);
					return [];
				}
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
