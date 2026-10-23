import type { Translator } from "@lucidcms/core/types";
import {
	createKiln,
	type KilnCache,
	type KilnCallable,
	type KilnFunctions,
	type Loader,
} from "@lucidkiln/core";
import propTypes from "../content/prop-types.js";
import bindSiteFunction from "../functions/bind-site-function.js";
import createReadFunctions, {
	type SiteReadFunctions,
} from "../functions/create-read-functions.js";
import editable from "../functions/editable.js";
import footer from "../functions/footer.js";
import head from "../functions/head.js";
import notFound from "../functions/not-found.js";
import redirect from "../functions/redirect.js";
import richText from "../functions/rich-text.js";
import { getSiteFunctionSource } from "../functions/site-function-source.js";
import createTranslateFunction from "../functions/translate.js";
import createViteFunction from "../functions/vite.js";
import createViteAssetFunction from "../functions/vite-asset.js";
import type {
	SiteData,
	SiteExtension,
	SitePluginOptions,
	SiteState,
} from "../types.js";
import type { SiteConfig } from "./create-site-config.js";
import mergeKilnEntries, { type KilnEntryKind } from "./merge-kiln-entries.js";

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
	config: SiteConfig;
	options: SitePluginOptions;
	data: SiteData;
	/** Reads the `site` translation scope. */
	lookupTranslation: Translator["lookup"];
	cache?: KilnCache<SiteState>;
	cacheNamespace?: string;
}) => {
	const reads = createReadFunctions(props.config);
	const functions = {
		...reads,
		richText,
		translate: createTranslateFunction({
			config: props.config,
			lookup: props.lookupTranslation,
			development: props.data.kind === "dev",
		}),
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
		debug: props.data?.kind === "dev",
		// Each render sets `locale` to its own; the default here lets checks and types know it.
		globals: merge("global", (source) => source.globals, {
			locale: props.config.defaultLocale,
		}),
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
			...propTypes,
			...merge("type", (source) => source.types, propTypes),
		},
	});
};

export type SiteKiln = ReturnType<typeof createSiteKiln>;

export default createSiteKiln;
