import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/pages";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const COMPONENTS_MODULE = "@lucidcms/pages/components";
export const REBUILD_PATHS_ROUTE = "/api/v1/pages/rebuild-paths";
export const CLEAR_PATH_HISTORY_ROUTE = "/api/v1/pages/clear-path-history";
export const PREVIOUS_PATHS_ROUTE = "/api/v1/pages/previous-paths";
/** Maintenance jobs of each kind per user within the window. Each one reads every page. */
export const MAINTENANCE_RATE_LIMIT = 5;
export const MAINTENANCE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Collection registered for redirects unless `redirects: false`. */
export const REDIRECTS_COLLECTION_KEY = "redirects";
/** Pages' earlier published paths, which redirect to their current ones. */
export const PATH_HISTORY_TABLE = "plugin_pages_path_history";

export const redirectFields = {
	from: "from",
	targetType: "targetType",
	targetDocument: "targetDocument",
	targetUrl: "targetUrl",
	statusCode: "statusCode",
	locale: "locale",
} as const;

export const redirectTargetTypes = {
	document: "document",
	url: "url",
} as const;

export const redirectStatusCodes = ["301", "302", "307", "308"] as const;

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
