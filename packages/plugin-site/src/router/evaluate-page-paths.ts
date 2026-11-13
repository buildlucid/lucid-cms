import { LucidError } from "@lucidcms/core";
import { findRoute } from "rou3";
import { PLUGIN_KEY } from "../constants.js";
import type { Site } from "../site/create-site-loader.js";
import renderOptions from "../site/render-options.js";
import type { SitePage, SiteState } from "../types.js";
import isRecord from "../utils/is-record.js";
import normalizePath from "../utils/normalize-path.js";
import fillPagePattern from "./fill-page-pattern.js";
import getRouteParams from "./get-route-params.js";

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

/**
 * Evaluates the `paths` exports of pages with route parameters, as static builds and the sitemap
 * read them, into the URLs each lists. Every entry must route back to its page with the same
 * values, or this throws listing those that don't.
 */
const evaluatePagePaths = async (props: {
	site: Site;
	pages: ReadonlyArray<SitePage>;
	/** Exports run before any page renders, so there is no request path. */
	state: SiteState;
}): Promise<Array<{ page: SitePage; paths: string[] }>> => {
	const problems: string[] = [];
	const listed = await Promise.all(
		props.pages.map(async (page) => {
			const entries = await props.site.freshKiln.evaluate(
				page.template,
				"paths",
				renderOptions(props.state),
			);
			if (!Array.isArray(entries)) {
				problems.push(
					`'${page.template}' exports paths as something other than a list`,
				);
				return { page, paths: [] };
			}

			return {
				page,
				paths: entries.flatMap((entry) => {
					const result = toPagePath(props.site, page, entry);
					if (result.error !== undefined) {
						problems.push(result.error);
						return [];
					}

					return [result.data];
				}),
			};
		}),
	);

	if (problems.length > 0) {
		const more = problems.length - MAX_PROBLEMS;
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Some paths don't fit their pages:\n${problems.slice(0, MAX_PROBLEMS).join("\n")}${more > 0 ? `\n…and ${more} more` : ""}`,
		});
	}

	return listed;
};

export default evaluatePagePaths;
