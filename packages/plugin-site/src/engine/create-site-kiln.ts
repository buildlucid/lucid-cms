import {
	createKiln,
	type KilnCache,
	type KilnCallable,
	type KilnFunctions,
	type Loader,
} from "@lucidkiln/core";
import type {
	SiteCliData,
	SiteExtension,
	SitePluginOptions,
	SiteState,
} from "../types.js";
import bindSiteFunction, {
	type SiteReadFunctions,
} from "./bind-site-function.js";
import createDocumentFunction from "./functions/document.js";
import createDocumentPathsFunction from "./functions/document-paths.js";
import createDocumentsFunction from "./functions/documents.js";
import editable from "./functions/editable.js";
import footer from "./functions/footer.js";
import head from "./functions/head.js";
import notFound from "./functions/not-found.js";
import redirect from "./functions/redirect.js";
import createViteFunction from "./functions/vite.js";
import createViteAssetFunction from "./functions/vite-asset.js";
import mergeKilnEntries, { type KilnEntryKind } from "./merge-kiln-entries.js";
import { getSiteFunctionSource } from "./site-function-sources.js";
import type { SiteFunctionsContext } from "./site-functions-context.js";
import templateTypes from "./template-types.js";

type Callables = Record<string, KilnCallable<SiteState>>;
type SiteEntries = Omit<SiteExtension, "name">;

/** Gives `defineSiteFunction` callables this Kiln's reads; anything else passes through. */
const bindSiteFunctions = (callables: Callables, reads: SiteReadFunctions) =>
	Object.fromEntries(
		Object.entries(callables).map(([name, callable]) => {
			const source = getSiteFunctionSource(callable);
			return [name, source ? bindSiteFunction(source, reads) : callable];
		}),
	);

const createSiteKiln = (props: {
	loader: Loader;
	context: SiteFunctionsContext;
	options: SitePluginOptions;
	data: SiteCliData | null;
	cache?: KilnCache;
	cacheNamespace?: string;
}) => {
	const reads: SiteReadFunctions = {
		document: createDocumentFunction(props.context),
		documents: createDocumentsFunction(props.context),
		documentPaths: createDocumentPathsFunction(props.context),
	};
	const functions = {
		...reads,
		editable,
		head,
		footer,
		notFound,
		redirect,
		vite: createViteFunction(props.data),
		viteAsset: createViteAssetFunction(props.data),
	} satisfies KilnFunctions;

	const kiln = props.options.kiln ?? {};
	const merge = <Value>(
		kind: KilnEntryKind,
		pick: (source: SiteEntries) => Record<string, Value> | undefined,
		builtIns?: Record<string, Value>,
	) =>
		mergeKilnEntries({
			kind,
			builtIns,
			extensions: (kiln.extensions ?? []).map((extension) => ({
				name: extension.name,
				entries: pick(extension),
			})),
			own: pick(kiln),
		});

	return createKiln<SiteState>({
		loader: props.loader,
		cache: props.cache,
		cacheNamespace: props.cacheNamespace,
		timeZone: kiln.timeZone,
		// Enables dump() while developing.
		debug: props.data?.mode === "dev",
		globals: merge("global", (source) => source.globals),
		functions: bindSiteFunctions(
			merge("function", (source) => source.functions, functions),
			reads,
		),
		filters: bindSiteFunctions(
			merge("filter", (source) => source.filters),
			reads,
		),
		tests: bindSiteFunctions(
			merge("test", (source) => source.tests),
			reads,
		),
		// Spread so the Document and Brick checks Kiln requires stay visible to its types.
		types: {
			...templateTypes,
			...merge("type", (source) => source.types, templateTypes),
		},
	});
};

export type SiteKiln = ReturnType<typeof createSiteKiln>;

export default createSiteKiln;
