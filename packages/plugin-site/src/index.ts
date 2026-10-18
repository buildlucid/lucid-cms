import plugin from "./plugin.js";

export { default as defineRoutes } from "./define-routes.js";
export type {
	TemplateBrick,
	TemplateDocument,
} from "./engine/to-template-document.js";
export { default as sitePlugin } from "./plugin.js";
export type {
	SiteMode,
	SitePathsProps,
	SitePluginOptions,
	SitePreview,
	SiteRoute,
	SiteRoutes,
	SiteState,
} from "./types.js";

export default plugin;
