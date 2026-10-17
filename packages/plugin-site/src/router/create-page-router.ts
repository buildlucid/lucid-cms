import { LucidError } from "@lucidcms/core";
import { addRoute, createRouter } from "rou3";
import { buildTree, toRou3 } from "unrouting";
import {
	PAGES_DIRECTORY,
	PLUGIN_KEY,
	TEMPLATE_EXTENSION,
} from "../constants.js";
import type { SiteMode, SitePage, SiteRoutes } from "../types.js";
import getContentType from "./get-content-type.js";

const isPageTemplate = (name: string) =>
	name.startsWith(`${PAGES_DIRECTORY}/`) &&
	name.endsWith(TEMPLATE_EXTENSION) &&
	!name.split("/").some((segment) => segment.startsWith("_"));

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

const assertRouteFits = (page: SitePage, siteMode: SiteMode) => {
	if (siteMode === "static" && page.route.mode !== undefined) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `The '${page.name}' route sets a mode, but a static site renders every page at build.`,
		});
	}
	if (page.route.revalidate !== undefined && page.mode !== "isr") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `The '${page.name}' route sets revalidate, which only applies to pages rendered with ISR.`,
		});
	}
};

const createPageRouter = (
	templateNames: Iterable<string>,
	options: { mode?: SiteMode; routes?: SiteRoutes } = {},
) => {
	const siteMode = options.mode ?? "ssr";
	const routes = options.routes ?? {};
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

		const name = getPageName(item.file);
		const route = routes[name] ?? {};
		const page: SitePage = {
			template: item.file,
			name,
			pattern: item.path,
			contentType: getContentType(item.path),
			mode: route.mode ?? (siteMode === "isr" ? "isr" : "ssr"),
			route,
		};
		assertRouteFits(page, siteMode);
		addRoute(router, "GET", item.path, page);
		pages.push(page);
	}

	const unknown = Object.keys(routes).filter(
		(name) => !pages.some((page) => page.name === name),
	);
	if (unknown.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `These routes name no page in '${PAGES_DIRECTORY}/': ${unknown.join(", ")}. Use the page's file without '${TEMPLATE_EXTENSION}', such as 'blog/[slug]'.`,
		});
	}

	return { router, pages };
};

export default createPageRouter;
