import plugin from "./plugin.js";

export type {
	ContentBrick,
	ContentDocument,
	ContentList,
	ContentPagination,
	ContentRelatedDocument,
	LocalizedMedia,
	LocalizedUser,
} from "@lucidcms/core/types";
export { default as defineSiteFunction } from "./functions/define-site-function.js";
export { default as sitePlugin } from "./plugin.js";
export type {
	SiteExtension,
	SiteFunctionContext,
	SiteKilnOptions,
	SiteLocaleContext,
	SiteMode,
	SitePagePaths,
	SitePluginOptions,
	SitePreview,
	SiteState,
} from "./types.js";

export default plugin;
