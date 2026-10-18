import plugin from "./plugin.js";

export type {
	TemplateBrick,
	TemplateDocument,
} from "./content/to-template-document.js";
export type {
	TemplateList,
	TemplatePagination,
} from "./content/to-template-list.js";
export type { TemplateMedia } from "./content/to-template-media.js";
export type { TemplateRelatedDocument } from "./content/to-template-related-document.js";
export type { TemplateRichTextNode } from "./content/to-template-rich-text.js";
export type { TemplateUser } from "./content/to-template-user.js";
export { default as defineSiteFunction } from "./functions/define-site-function.js";
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
