import type { AdapterRuntimeContext } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteModule } from "../types.js";
import isRecord from "../utils/is-record.js";

/** Checks the exports of the site's server module. */
const isSiteModule = (value: unknown): value is SiteModule =>
	isRecord(value) &&
	isRecord(value.data) &&
	(value.data.kind === "dev" || value.data.kind === "build") &&
	isRecord(value.templates) &&
	isRecord(value.components) &&
	isRecord(value.renderers);

/** Reads the site server module from runtime context, or null when Lucid's Vite plugin hasn't provided it. */
const readSiteModule = (runtimeContext: AdapterRuntimeContext | undefined) => {
	const module = runtimeContext?.pluginModules?.[PLUGIN_KEY];
	return isSiteModule(module) ? module : null;
};

export default readSiteModule;
