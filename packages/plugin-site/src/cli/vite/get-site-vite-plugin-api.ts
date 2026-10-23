import type { ResolvedConfig } from "vite";
import { SITE_CLIENT_BUILD_PLUGIN_NAME } from "./site-client-build-plugin.js";
import type { SiteVitePluginApi } from "./types.js";

const isSiteVitePluginApi = (api: unknown): api is SiteVitePluginApi =>
	typeof api === "object" &&
	api !== null &&
	"clientBuild" in api &&
	typeof api.clientBuild === "function";

/** Reads the site plugin's `api` from a resolved Vite config, such as `site:build`'s builder, or null without it. */
const getSiteVitePluginApi = (config: ResolvedConfig) => {
	const api = config.plugins.find(
		(plugin) => plugin.name === SITE_CLIENT_BUILD_PLUGIN_NAME,
	)?.api;
	return isSiteVitePluginApi(api) ? api : null;
};

export default getSiteVitePluginApi;
