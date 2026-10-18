import { LucidError } from "@lucidcms/core";
import { addRoute, createRouter } from "rou3";
import { buildTree, toRou3 } from "unrouting";
import {
	PAGES_DIRECTORY,
	PLUGIN_KEY,
	TEMPLATE_EXTENSION,
} from "../constants.js";
import type { PageExports } from "../engine/read-page-exports.js";
import type { SiteMode, SitePage } from "../types.js";
import getContentType from "./get-content-type.js";
import isPageTemplate from "./is-page-template.js";

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
	if (page.revalidate !== undefined && page.mode !== "isr") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${page.template}' exports revalidate, which only applies to pages rendered with ISR.`,
		});
	}
};

/** Routes the templates in `pages/`, with each page's `mode`, `revalidate` and `paths` exports keyed by template. */
const createPageRouter = (
	templateNames: Iterable<string>,
	options: {
		mode?: SiteMode;
		exports?: ReadonlyMap<string, PageExports>;
	} = {},
) => {
	const siteMode = options.mode ?? "ssr";
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
			paths: exported.paths,
		};
		assertExportsFit(page, exported, siteMode);
		addRoute(router, "GET", item.path, page);
		pages.push(page);
	}

	return { router, pages };
};

export default createPageRouter;
