import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import { type Loader, memoryLoader } from "@lucidkiln/core";
import type { RouterContext } from "rou3";
import { DEFAULT_SITE_DIRECTORY, PLUGIN_KEY } from "../constants.js";
import createFragmentCache from "../engine/create-fragment-cache.js";
import createSiteKiln, { type SiteKiln } from "../engine/create-site-kiln.js";
import hashTemplates from "../engine/hash-templates.js";
import isSiteCliData from "../engine/is-site-cli-data.js";
import resolveSiteEnvironment from "../engine/resolve-site-environment.js";
import createSiteFunctionsContext, {
	type SiteFunctionsContext,
} from "../engine/site-functions-context.js";
import createPageRouter from "../router/create-page-router.js";
import type { SiteCliData, SitePage, SitePluginOptions } from "../types.js";
import sha256 from "../utils/sha256.js";
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
	version: string;
	functions: SiteFunctionsContext;
};

const readCliData = (context: ServiceContext) => {
	const data = context.runtimeContext?.pluginData?.[PLUGIN_KEY];
	return isSiteCliData(data) ? data : null;
};

/** Built sites read the templates bundled at build time; development reads the directory. */
const createLoader = async (
	directory: string,
	data: SiteCliData | null,
): Promise<Loader> => {
	if (data?.mode === "build") return memoryLoader(data.templates);
	const { fileLoader } = await import("@lucidkiln/core/node");
	return fileLoader({ root: directory });
};

/** The CLI resolves the directory from the project root; without it, it's relative to the working directory. */
const resolveDirectory = (option: string, data: SiteCliData | null) =>
	data?.mode === "dev" ? data.directory : option;

const loadSite = async (props: {
	directory: string;
	data: SiteCliData | null;
	functions: SiteFunctionsContext;
	options: SitePluginOptions;
	context: ServiceContext;
}): Promise<Site> => {
	const { data } = props;
	const loader = await createLoader(props.directory, data);
	const templates = new Set(await loader.list?.());
	const templatesHash = await hashTemplates(loader, templates);
	// Stored pages link to hashed asset files, so a new build must not serve pages from the last one.
	const version =
		data?.mode === "build" && data.manifest
			? (await sha256(templatesHash + JSON.stringify(data.manifest))).slice(
					0,
					16,
				)
			: templatesHash;
	const { router, pages } = createPageRouter(templates, {
		mode: props.options.mode,
		routes: props.options.routes,
	});
	const kilnProps = {
		loader,
		context: props.functions,
		options: props.options,
		data,
	};

	return {
		kiln: createSiteKiln({
			...kilnProps,
			cache: createFragmentCache(props.context),
			cacheNamespace: version,
		}),
		freshKiln: createSiteKiln(kilnProps),
		router,
		pages,
		data,
		templates,
		version,
		functions: props.functions,
	};
};

const createSiteLoader = (
	options: SitePluginOptions,
	config: ResolvedLucidConfig,
) => {
	const directory = options.directory ?? DEFAULT_SITE_DIRECTORY;
	const functions = createSiteFunctionsContext(
		config,
		resolveSiteEnvironment(config, options.environment),
	);
	let site: Promise<Site> | undefined;

	return (props: {
		reload: boolean;
		context: ServiceContext;
	}): Promise<Site> => {
		const data = readCliData(props.context);
		// Built templates can't change, so only the directory reloads.
		const reloads = props.reload && data?.mode !== "build";
		if (site && !reloads) return site;

		const siteDirectory = resolveDirectory(directory, data);
		const loading = loadSite({
			directory: siteDirectory,
			data,
			functions,
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
