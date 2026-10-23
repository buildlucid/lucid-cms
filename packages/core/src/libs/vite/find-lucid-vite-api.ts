import type { PluginOption } from "vite";
import { LucidError } from "../../utils/errors/index.js";
import { isLucidConfigPlugin } from "./lucid-config-plugin.js";
import type { LucidViteApi } from "./types.js";

/** Finds Lucid's loaded-project API in resolved config plugins for commands or in `lucid()` results for hosts such as Astro. */
const findLucidViteApi = (plugins: readonly PluginOption[]): LucidViteApi => {
	const plugin = plugins.find(isLucidConfigPlugin);
	if (!plugin) {
		throw new LucidError({
			message: "The Vite plugins don't include Lucid's.",
		});
	}
	return plugin.api;
};

export default findLucidViteApi;
