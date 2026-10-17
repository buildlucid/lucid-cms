import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import { type Loader, memoryLoader } from "@lucidkiln/core";
import type { RouterContext } from "rou3";
import { DEFAULT_TEMPLATE_DIRECTORY } from "../constants.js";
import createFragmentCache from "../engine/create-fragment-cache.js";
import createSiteKiln, { type SiteKiln } from "../engine/create-site-kiln.js";
import hashTemplates from "../engine/hash-templates.js";
import resolveSiteEnvironment from "../engine/resolve-site-environment.js";
import createSiteFunctionsContext, {
	type SiteFunctionsContext,
} from "../engine/site-functions-context.js";
import createPageRouter from "../router/create-page-router.js";
import type { SitePage, SitePluginOptions, SiteTemplates } from "../types.js";
import writeKilnManifest from "./write-kiln-manifest.js";

export type Site = {
	kiln: SiteKiln;
	/** Bypasses fragment caching to keep drafts private and track every read for ISR and builds. */
	freshKiln: SiteKiln;
	router: RouterContext<SitePage>;
	pages: SitePage[];
	templates: ReadonlySet<string>;
	version: string;
	functions: SiteFunctionsContext;
};

const createLoader = async (
	source: string | SiteTemplates,
): Promise<Loader> => {
	if (typeof source !== "string") return memoryLoader(source);
	const { fileLoader } = await import("@lucidkiln/core/node");
	return fileLoader({ root: source });
};

const loadSite = async (props: {
	source: string | SiteTemplates;
	functions: SiteFunctionsContext;
	options: SitePluginOptions;
	context: ServiceContext;
}): Promise<Site> => {
	const loader = await createLoader(props.source);
	const templates = new Set(await loader.list?.());
	const version = await hashTemplates(loader, templates);
	const { router, pages } = createPageRouter(templates, {
		mode: props.options.mode,
		routes: props.options.routes,
	});
	const kilnProps = {
		loader,
		context: props.functions,
		options: props.options,
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
		templates,
		version,
		functions: props.functions,
	};
};

const createSiteLoader = (
	options: SitePluginOptions,
	config: ResolvedLucidConfig,
) => {
	const source = options.templates ?? DEFAULT_TEMPLATE_DIRECTORY;
	const functions = createSiteFunctionsContext(
		config,
		resolveSiteEnvironment(config, options.environment),
	);
	let site: Promise<Site> | undefined;

	return (props: {
		reload: boolean;
		context: ServiceContext;
	}): Promise<Site> => {
		if (site && !(props.reload && typeof source === "string")) return site;

		const loading = loadSite({
			source,
			functions,
			options,
			context: props.context,
		});
		loading.then(
			(loaded) => {
				if (props.reload && typeof source === "string") {
					return writeKilnManifest(source, loaded.kiln);
				}
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
