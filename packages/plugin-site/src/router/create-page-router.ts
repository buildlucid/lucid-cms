import { LucidError } from "@lucidcms/core";
import { addRoute, createRouter } from "rou3";
import { buildTree, toRou3 } from "unrouting";
import {
	HTML_CONTENT_TYPE,
	PAGES_DIRECTORY,
	PLUGIN_KEY,
	TEMPLATE_EXTENSION,
} from "../constants.js";
import type { SiteMode, SitePage } from "../types.js";
import getContentType from "./get-content-type.js";
import isDynamicPattern from "./is-dynamic-pattern.js";
import isPageTemplate from "./is-page-template.js";
import type { PageExports } from "./read-page-exports.js";

const specificity = (path: string) => {
	if (path.includes("*")) return 2;
	if (path.includes(":")) return 1;
	return 0;
};

const getPageName = (template: string) =>
	template.slice(
		PAGES_DIRECTORY.length + 1,
		template.length - TEMPLATE_EXTENSION.length,
	);

const assertExportsFit = (
	page: SitePage,
	exported: PageExports,
	siteMode: SiteMode,
) => {
	if (siteMode === "static" && exported.mode !== undefined) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports a mode, but a static site renders every page at build.`,
		});
	}
	if (siteMode === "static" && exported.cacheControl !== undefined) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports cacheControl, but a static site's headers are set by whatever serves its files.`,
		});
	}
	if (page.revalidate !== undefined && page.mode !== "isr") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports revalidate, which only applies to pages rendered with ISR.`,
		});
	}
	if (page.sitemap === true && page.contentType !== HTML_CONTENT_TYPE) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports sitemap = true, but the sitemap only lists HTML pages.`,
		});
	}
	if (page.sitemap === true && isDynamicPattern(page.pattern) && !page.paths) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports sitemap = true, but the sitemap lists a page with route parameters from its paths export. Add one, such as {% export paths = documentPaths("page") %}.`,
		});
	}
};

/** Routes the templates in `pages/`, with each page's `mode`, `revalidate`, `cacheControl`, `paths` and `sitemap` exports keyed by template. */
const createPageRouter = (
	templateNames: Iterable<string>,
	options: {
		mode?: SiteMode;
		/** The site's default `Cache-Control`, which page exports override. */
		cacheControl?: string;
		exports?: ReadonlyMap<string, PageExports>;
	} = {},
) => {
	const siteMode = options.mode ?? "ssr";
	if (siteMode === "static" && options.cacheControl !== undefined) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"The site plugin's cacheControl doesn't apply to static sites, whose headers are set by whatever serves their files.",
		});
	}
	const templates = [...templateNames].filter(isPageTemplate);
	const tree = buildTree(templates, {
		roots: [`${PAGES_DIRECTORY}/`],
		extensions: [TEMPLATE_EXTENSION],
	});

	const router = createRouter<SitePage>();
	const pages: SitePage[] = [];
	const claimed = new Map<string, string>();
	// rou3 keeps the first match at a shared path, so catch-alls must come last.
	const sorted = toRou3(tree).sort(
		(a, b) => specificity(a.path) - specificity(b.path),
	);
	for (const item of sorted) {
		const existing = claimed.get(item.path);
		if (existing) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `The pages '${existing}' and '${item.file}' both route to '${item.path}'.`,
			});
		}
		claimed.set(item.path, item.file);

		const exported = options.exports?.get(item.file) ?? { paths: false };
		const page: SitePage = {
			template: item.file,
			name: getPageName(item.file),
			pattern: item.path,
			contentType: getContentType(item.path),
			mode: exported.mode ?? (siteMode === "isr" ? "isr" : "ssr"),
			revalidate: exported.revalidate,
			cacheControl: exported.cacheControl ?? options.cacheControl,
			paths: exported.paths,
			sitemap: exported.sitemap,
		};
		assertExportsFit(page, exported, siteMode);
		addRoute(router, "GET", item.path, page);
		pages.push(page);
	}

	return { router, pages };
};

export default createPageRouter;
