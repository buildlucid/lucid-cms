import { LucidError, logger } from "@lucidcms/core";
import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import type { Loader } from "@lucidkiln/core";
import type { RouterContext } from "rou3";
import createFragmentCache from "../cache/create-fragment-cache.js";
import { PLUGIN_KEY } from "../constants.js";
import createPageRouter from "../router/create-page-router.js";
import isDynamicPattern from "../router/is-dynamic-pattern.js";
import isPageTemplate from "../router/is-page-template.js";
import readPageExports from "../router/read-page-exports.js";
import type {
	SiteData,
	SiteModule,
	SitePage,
	SitePluginOptionsInternal,
} from "../types.js";
import { moveUiAssets } from "../ui/page-assets.js";
import createSiteUi from "../ui/site-ui.js";
import withUi from "../ui/with-ui.js";
import sha256 from "../utils/sha256.js";
import createSiteConfig, { type SiteConfig } from "./create-site-config.js";
import createSiteKiln, { type SiteKiln } from "./create-site-kiln.js";
import hashTemplates from "./hash-templates.js";
import readSiteModule from "./read-site-module.js";
import resolveSiteEnvironment from "./resolve-site-environment.js";

export type Site = {
	kiln: SiteKiln;
	/** Bypasses fragment caching to keep drafts private and track every read for ISR and builds. */
	freshKiln: SiteKiln;
	router: RouterContext<SitePage>;
	pages: SitePage[];
	/** How the site's browser files are served: Vite's dev server or the client build. */
	data: SiteData;
	templates: ReadonlySet<string>;
	/** Combines a globals hash with the development template hash or build ID to namespace stored pages and fragments. */
	cacheNamespace: string;
	config: SiteConfig;
	/** Finishes an HTML page rendered in one go, rather than streamed: UI components' links move into its head. */
	finishPage: (html: string) => string;
};

/** A Kiln loader over the site module's templates, which load through the server environment. */
const moduleLoader = (templates: SiteModule["templates"]): Loader => ({
	list: () => Object.keys(templates),
	load: (name) => templates[name]?.() ?? null,
});

/** Wraps the template loader to return UI components for their names, when the site has any. */
const addUi = (loader: Loader, module: SiteModule, data: SiteData) => {
	const ui = createSiteUi(module, data);
	return ui ? withUi(loader, ui) : loader;
};

/** Warns while developing a static site, so a missing `paths` export doesn't first surface in `site:build`. */
const warnMissingPaths = (pages: SitePage[]) => {
	for (const page of pages) {
		if (!isDynamicPattern(page.pattern) || page.paths) continue;
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.page.missing-paths",
			dedupeKey: `${PLUGIN_KEY}:missing-paths:${page.template}`,
			message: `'${page.template}' has no paths export, so site:build can't tell which of its pages to make. Add one, such as {% export paths = documentPaths("page") %}.`,
		});
	}
};

const loadSite = async (props: {
	module: SiteModule;
	data: SiteData;
	/** The hash of the templates and translations, for development's cache namespace. */
	templateHash: string | null;
	config: SiteConfig;
	options: SitePluginOptionsInternal;
	context: ServiceContext;
}): Promise<Site> => {
	const { data } = props;
	const files = moduleLoader(props.module.templates);
	const loader = addUi(files, props.module, data);
	const templates = new Set(Object.keys(props.module.templates));

	// Each build uses a new cache namespace because code and assets can change without template changes.
	const sourceNamespace =
		data.kind === "build" ? data.buildId : (props.templateHash ?? "");

	// Hash globals to catch environment changes without a rebuild, excluding callables that JSON cannot serialise.
	const kiln = props.options.kiln ?? {};
	const globals = JSON.stringify([
		kiln.globals,
		...(kiln.extensions ?? []).map((extension) => extension.globals),
	]);
	const cacheNamespace = `${sourceNamespace}-${(await sha256(globals)).slice(0, 8)}`;

	const kilnProps = {
		loader,
		config: props.config,
		options: props.options,
		data,
		lookupTranslation: props.context.translate.lookup,
	};
	const freshKiln = createSiteKiln(kilnProps);

	const pageTemplates = [...templates].filter(isPageTemplate);
	const exports = new Map(
		await Promise.all(
			pageTemplates.map(
				async (template) =>
					[template, await readPageExports(freshKiln, template)] as const,
			),
		),
	);

	const { router, pages } = createPageRouter(templates, {
		mode: props.options.mode,
		cacheControl: props.options.cacheControl,
		exports,
	});

	if (props.options.mode === "static" && data.kind === "dev") {
		warnMissingPaths(pages);
	}

	return {
		kiln: createSiteKiln({
			...kilnProps,
			cache: createFragmentCache(),
			cacheNamespace,
		}),
		freshKiln,
		router,
		pages,
		data,
		templates,
		cacheNamespace,
		config: props.config,
		finishPage: (html) =>
			moveUiAssets(html, data.kind === "build" ? (data.ui?.styles ?? {}) : {}),
	};
};

const createSiteLoader = (
	options: SitePluginOptionsInternal,
	config: ResolvedLucidConfig,
) => {
	const siteConfig = createSiteConfig(
		config,
		options,
		resolveSiteEnvironment(config, options.environment),
	);
	let site: Promise<Site> | undefined;
	/** What the current site was loaded from: its data and, in development, its template hash. */
	let loadedFrom: { data: SiteData; templateHash: string | null } | undefined;

	return async (props: {
		context: ServiceContext;
		/** Replaces how browser files are served, such as for `site:build`, which builds its own. */
		data?: SiteData;
	}): Promise<Site> => {
		const module = readSiteModule(props.context.runtimeContext);
		if (!module) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message:
					"The site's server module is missing. Run Lucid through its Vite plugin, with lucidcms dev or lucidcms build.",
			});
		}

		const data = props.data ?? module.data;

		// Development hashes the templates on every request and reloads the site when one changed, so edits need no
		// restart. Templates load through Vite, which hands back each file's latest source.
		const templateHash =
			data.kind === "dev"
				? `${await hashTemplates(
						moduleLoader(module.templates),
						Object.keys(module.templates),
						props.context.translate.scopeBundles("site"),
					)}-${data.revision}`
				: null;

		if (
			site &&
			loadedFrom?.data === data &&
			loadedFrom.templateHash === templateHash
		) {
			return site;
		}

		loadedFrom = { data, templateHash };

		const loading = loadSite({
			module,
			data,
			templateHash,
			config: siteConfig,
			options,
			context: props.context,
		});
		// A failed load retries on the next request.
		loading.catch(() => {
			if (site === loading) site = undefined;
		});
		site = loading;

		return loading;
	};
};

export default createSiteLoader;
