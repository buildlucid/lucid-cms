import type { AdapterRuntimeContext } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import isSiteCliData from "./is-site-cli-data.js";

/** Reads what the site's CLI module handed the runtime, or null when it didn't run. */
const readCliData = (runtimeContext: AdapterRuntimeContext | undefined) => {
	const data = runtimeContext?.pluginData?.[PLUGIN_KEY];
	return isSiteCliData(data) ? data : null;
};

export default readCliData;
