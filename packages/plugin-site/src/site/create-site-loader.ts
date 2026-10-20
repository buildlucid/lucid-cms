import { logger } from "@lucidcms/core";
import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import { type Loader, memoryLoader } from "@lucidkiln/core";
import type { RouterContext } from "rou3";
import createFragmentCache from "../cache/create-fragment-cache.js";
import { PLUGIN_KEY } from "../constants.js";
import createPageRouter from "../router/create-page-router.js";
import isDynamicPattern from "../router/is-dynamic-pattern.js";
import isPageTemplate from "../router/is-page-template.js";
import readPageExports from "../router/read-page-exports.js";
import type {
	SiteCliData,
	SitePage,
	SitePluginOptionsInternal,
} from "../types.js";
import createSiteConfig, { type SiteConfig } from "./create-site-config.js";
import createSiteKiln, { type SiteKiln } from "./create-site-kiln.js";
import hashTemplates from "./hash-templates.js";
import readCliData from "./read-cli-data.js";
import resolveSiteEnvironment from "./resolve-site-environment.js";
import writeKilnManifest from "./write-kiln-manifest.js";

export type Site = {
	kiln: SiteKiln;
	/** Bypasses fragment caching to keep drafts private and track every read for ISR and builds. */
	freshKiln: SiteKiln;
	router: RouterContext<SitePage>;
	pages: SitePage[];
	/** Vite's dev server or the built site, or null when Vite isn't installed and nothing was built. */
	data: SiteCliData | null;
	templates: ReadonlySet<string>;
	/** Namespaces stored pages and fragments: a hash of the templates in development, or the build ID once built. */
	cacheNamespace: string;
	config: SiteConfig;
};

/** Built sites read the templates bundled at build time; development reads the directory. */
const createLoader = async (
	directory: string,
	data: SiteCliData | null,
): Promise<Loader> => {
	if (data?.kind === "build") return memoryLoader(data.templates);
	const { fileLoader } = await import("@lucidkiln/core/node");
	return fileLoader({ root: directory });
};

/** The CLI resolves the directory from the project root; without it, it's relative to the working directory. */
const resolveDirectory = (option: string, data: SiteCliData | null) =>
	data?.kind === "dev" ? data.directory : option;

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
	directory: string;
	data: SiteCliData | null;
	config: SiteConfig;
	options: SitePluginOptionsInternal;
	context: ServiceContext;
}): Promise<Site> => {
	const { data } = props;
	const loader = await createLoader(props.directory, data);
	const templates = new Set(await loader.list?.());
	// Each build uses a new cache namespace because code and assets can change without template changes.
	const cacheNamespace =
		data?.kind === "build"
			? data.buildId
			: await hashTemplates(
					loader,
					templates,
					props.context.translate.scopeBundles("site"),
				);
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
	if (props.options.mode === "static" && data?.kind === "dev") {
		warnMissingPaths(pages);
	}

	return {
		kiln: createSiteKiln({
			...kilnProps,
			cache: createFragmentCache(props.context),
			cacheNamespace,
		}),
		freshKiln,
		router,
		pages,
		data,
		templates,
		cacheNamespace,
		config: props.config,
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

	return (props: {
		context: ServiceContext;
		/** Replaces what the CLI handed the runtime, such as for `site:build`, which builds its own. */
		data?: SiteCliData;
	}): Promise<Site> => {
		const data = props.data ?? readCliData(props.context.runtimeContext);
		// Development reloads the directory on every request so edits need no restart; built templates can't change.
		const reloads =
			props.context.runtimeContext?.compiled === false &&
			data?.kind !== "build";
		if (site && !reloads) return site;

		const siteDirectory = resolveDirectory(options.directory, data);
		const loading = loadSite({
			directory: siteDirectory,
			data,
			config: siteConfig,
			options,
			context: props.context,
		});
		loading.then(
			(loaded) => {
				if (reloads) return writeKilnManifest(siteDirectory, loaded.kiln);
			},
			() => {
				if (site === loading) site = undefined;
			},
		);
		site = loading;

		return loading;
	};
};

export default createSiteLoader;
