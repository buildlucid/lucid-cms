import plugin from "./plugin.js";

export { default as defineSiteFunction } from "./define-site-function.js";
export type {
	TemplateBrick,
	TemplateDocument,
} from "./engine/to-template-document.js";
export type {
	TemplateList,
	TemplatePagination,
} from "./engine/to-template-list.js";
export type { TemplateMedia } from "./engine/to-template-media.js";
export type { TemplateRelatedDocument } from "./engine/to-template-related-document.js";
export type { TemplateRichTextNode } from "./engine/to-template-rich-text.js";
export type { TemplateUser } from "./engine/to-template-user.js";
export { default as sitePlugin } from "./plugin.js";
export type {
	SiteExtension,
	SiteFunctionContext,
	SiteKilnOptions,
	SiteMode,
	SitePagePaths,
	SitePluginOptions,
	SitePreview,
	SiteState,
} from "./types.js";

export default plugin;
