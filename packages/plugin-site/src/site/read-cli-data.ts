import type { AdapterRuntimeContext } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteCliData } from "../types.js";
import isRecord from "../utils/is-record.js";

/** Checks the plugin data the site's CLI module hands the runtime. */
const isSiteCliData = (value: unknown): value is SiteCliData =>
	isRecord(value) &&
	((value.kind === "dev" &&
		typeof value.directory === "string" &&
		typeof value.vite === "boolean") ||
		(value.kind === "build" &&
			isRecord(value.templates) &&
			(value.manifest === null || isRecord(value.manifest))));

/** Reads what the site's CLI module handed the runtime, or null when it didn't run. */
const readCliData = (runtimeContext: AdapterRuntimeContext | undefined) => {
	const data = runtimeContext?.pluginData?.[PLUGIN_KEY];
	return isSiteCliData(data) ? data : null;
};

export default readCliData;
