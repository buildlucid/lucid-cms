import {
	createKiln,
	type KilnCache,
	type KilnFunctions,
	type Loader,
} from "@lucidkiln/core";
import type { SiteCliData, SitePluginOptions, SiteState } from "../types.js";
import createDocumentFunction from "./functions/document.js";
import createDocumentsFunction from "./functions/documents.js";
import editable from "./functions/editable.js";
import footer from "./functions/footer.js";
import head from "./functions/head.js";
import notFound from "./functions/not-found.js";
import redirect from "./functions/redirect.js";
import createViteFunction from "./functions/vite.js";
import createViteAssetFunction from "./functions/vite-asset.js";
import type { SiteFunctionsContext } from "./site-functions-context.js";
import templateTypes from "./template-types.js";

const createSiteKiln = (props: {
	loader: Loader;
	context: SiteFunctionsContext;
	options: SitePluginOptions;
	data: SiteCliData | null;
	cache?: KilnCache;
	cacheNamespace?: string;
}) => {
	const functions = {
		document: createDocumentFunction(props.context),
		documents: createDocumentsFunction(props.context),
		editable,
		head,
		footer,
		notFound,
		redirect,
		vite: createViteFunction(props.data),
		viteAsset: createViteAssetFunction(props.data),
	} satisfies KilnFunctions;

	return createKiln<SiteState>({
		loader: props.loader,
		cache: props.cache,
		cacheNamespace: props.cacheNamespace,
		globals: props.options.globals,
		filters: props.options.filters,
		tests: props.options.tests,
		types: templateTypes,
		functions: { ...functions, ...props.options.functions },
	});
};

export type SiteKiln = ReturnType<typeof createSiteKiln>;

export default createSiteKiln;
