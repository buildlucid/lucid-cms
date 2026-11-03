import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/plugin-pages";
export const LUCID_VERSION = "0.x.x";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const COMPONENTS_MODULE = "@lucidcms/plugin-pages/components";
export const REBUILD_PATHS_ROUTE = "/api/v1/pages/rebuild-paths";
/** Rebuilds per user within the window. Each one recalculates every page's path. */
export const REBUILD_PATHS_RATE_LIMIT = 5;
export const REBUILD_PATHS_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export default {
	fields: {
		parentPage: {
			key: "parentPage",
		},
		slug: {
			key: "slug",
		},
		path: {
			key: "path",
		},
	},
};
